import { describe, expect, it } from 'vitest'
import {
  computeMasteryOverview,
  computeOperationLevelMasteryStatus
} from './masteryCalculation'

function result(index, overrides = {}) {
  return {
    observationId: `obs-${index}`,
    problemId: `problem-${index}`,
    operation: 'multiplication',
    skill: 'multiplication',
    level: 4,
    evidenceSkill: 'multiplication',
    evidenceLevel: 4,
    evidenceRuleVersion: 1,
    correct: true,
    timestamp: Date.now() + index,
    ...overrides
  }
}

describe('mastery evidence policy', () => {
  it('excludes current and recognizable legacy table-drill answers from general mastery', () => {
    const problems = [
      ...Array.from({ length: 5 }, (_, index) => result(index, {
        evidenceClass: 'practice_only',
        problemType: 'mul_table_drill',
        skillTag: 'mul_table_7'
      })),
      result(6, {
        evidenceClass: undefined,
        problemType: 'mul_table_drill',
        skillTag: 'mul_table_8'
      })
    ]

    expect(computeOperationLevelMasteryStatus(problems, 'multiplication', 4)).toMatchObject({
      attempts: 0,
      correct: 0,
      isMastered: false
    })
  })

  it('uses persisted hidden evidence identity after serialization', () => {
    const problems = Array.from({ length: 5 }, (_, index) => ({
      ...result(index),
      operation: 'positions_decimal',
      skill: 'addition',
      evidenceSkill: 'positions_decimal',
      evidenceLevel: 1,
      evidenceClass: 'mastery_eligible'
    }))
    const restored = JSON.parse(JSON.stringify(problems))

    expect(computeOperationLevelMasteryStatus(restored, 'positions_decimal', 1)).toMatchObject({
      attempts: 5,
      correct: 5,
      isMastered: true
    })
    expect(computeOperationLevelMasteryStatus(restored, 'addition', 4).attempts).toBe(0)
  })

  it('does not create mastery facts as a side effect of reading an overview', () => {
    const problems = Array.from({ length: 5 }, (_, index) => result(index, {
      evidenceClass: 'mastery_eligible'
    }))
    const profile = { masteryFacts: { version: 1, facts: [], revokedIds: [] } }

    expect(computeMasteryOverview(problems, { profile }).multiplication).toEqual([4])
    expect(profile.masteryFacts.facts).toEqual([])
  })
})

