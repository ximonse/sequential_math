import { describe, expect, it } from 'vitest'
import {
  computeMasteryOverview,
  computeOperationLevelMasteryStatus,
  getMasteredLevelsFromFacts,
  recordMasteryAchievement
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
  it('requires broader evidence before geometry mastery', () => {
    const base = Array.from({ length: 8 }, (_, index) => result(index, {
      operation: 'geometry_2d_objects',
      evidenceSkill: 'geometry_2d_objects',
      level: 1,
      evidenceLevel: 1,
      correct: index < 7,
      evidenceClass: 'mastery_eligible',
      varietyTemplate: `template_${index % 3}`,
      representation: index % 2 === 0 ? 'diagram' : 'text_property'
    }))

    expect(computeOperationLevelMasteryStatus(base, 'geometry_2d_objects', 1)).toMatchObject({
      attempts: 8,
      correct: 7,
      isMastered: true,
      uniqueTemplates: 3,
      representations: 2
    })

    const narrow = base.map(item => ({ ...item, varietyTemplate: 'same', representation: 'diagram' }))
    expect(computeOperationLevelMasteryStatus(narrow, 'geometry_2d_objects', 1).isMastered).toBe(false)
  })

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

  it('keeps an unreferenced legacy fact out of mastery authority', () => {
    const profile = {
      masteryFacts: {
        version: 1,
        facts: [{
          id: 'addition:1:legacy',
          operation: 'addition',
          level: 1,
          achievedAt: 1000,
          window: { attempts: 5, correct: 5, rate: 1 },
          source: 'session'
        }, {
          operation: 'addition',
          level: 1,
          ruleVersion: 1,
          evidenceObservationIds: ['obs-without-traceable-fact']
        }],
        revokedIds: []
      }
    }

    expect(computeMasteryOverview([], { profile })).toEqual({})
    expect(getMasteredLevelsFromFacts(profile, 'addition')).toEqual([])
  })

  it('adds a referenced contract fact without deleting the legacy record', () => {
    const profile = {
      masteryFacts: {
        version: 1,
        facts: [{
          id: 'addition:1:legacy',
          operation: 'addition',
          level: 1,
          achievedAt: 1000,
          window: { attempts: 5, correct: 5, rate: 1 },
          source: 'session'
        }],
        revokedIds: []
      }
    }

    const fact = recordMasteryAchievement(
      profile,
      'addition',
      1,
      { attempts: 5, correct: 5, rate: 1 },
      { ruleVersion: 1, evidenceObservationIds: ['obs-1'] }
    )

    expect(fact).toMatchObject({ ruleVersion: 1, evidenceObservationIds: ['obs-1'] })
    expect(profile.masteryFacts.facts).toHaveLength(2)
    expect(getMasteredLevelsFromFacts(profile, 'addition')).toEqual([1])
  })

  it('refuses to create a new mastery fact without observation references', () => {
    const profile = { masteryFacts: { version: 1, facts: [], revokedIds: [] } }

    expect(recordMasteryAchievement(
      profile,
      'addition',
      1,
      { attempts: 5, correct: 5, rate: 1 },
      { ruleVersion: 1 }
    )).toBeNull()
    expect(profile.masteryFacts.facts).toEqual([])
  })

  it('allows new evidence after a previous contract fact was revoked', () => {
    const profile = {
      masteryFacts: {
        version: 1,
        facts: [{
          id: 'addition:1:1000',
          operation: 'addition',
          level: 1,
          achievedAt: 1000,
          window: { attempts: 5, correct: 5, rate: 1 },
          source: 'session',
          ruleVersion: 1,
          evidenceObservationIds: ['obs-old']
        }],
        revokedIds: ['addition:1:1000']
      }
    }

    expect(recordMasteryAchievement(
      profile,
      'addition',
      1,
      { attempts: 5, correct: 5, rate: 1 },
      { ruleVersion: 1, evidenceObservationIds: ['obs-new'] }
    )).toMatchObject({ evidenceObservationIds: ['obs-new'] })
    expect(profile.masteryFacts.facts).toHaveLength(2)
    expect(getMasteredLevelsFromFacts(profile, 'addition')).toEqual([1])
  })
})
