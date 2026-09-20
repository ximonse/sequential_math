import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_CLASSES,
  attachEvidenceClaim,
  isMasteryEligible,
  readEvidenceClaim
} from './evidenceContract'

describe('evidence contract', () => {
  it('keeps presentation content separate from hidden decimal evidence', () => {
    const problem = attachEvidenceClaim({
      skill: 'addition',
      level: 4,
      difficulty: { conceptual_level: 4 },
      metadata: { evidenceSkill: 'positions_decimal', evidenceLevel: 1 }
    })

    expect(readEvidenceClaim(problem)).toMatchObject({
      contentSkill: 'addition',
      contentLevel: 4,
      skill: 'positions_decimal',
      level: 1,
      class: EVIDENCE_CLASSES.MASTERY_ELIGIBLE
    })
  })

  it('classifies current and legacy table drills as practice-only', () => {
    const current = attachEvidenceClaim({
      skill: 'multiplication',
      level: 4,
      template: 'mul_table_drill',
      difficulty: { conceptual_level: 4 },
      metadata: { skillTag: 'mul_table_7' }
    })
    const legacy = {
      operation: 'multiplication',
      difficulty: { conceptual_level: 4 },
      problemType: 'mul_table_drill',
      skillTag: 'mul_table_7'
    }

    expect(readEvidenceClaim(current).class).toBe(EVIDENCE_CLASSES.PRACTICE_ONLY)
    expect(isMasteryEligible(current)).toBe(false)
    expect(isMasteryEligible(legacy)).toBe(false)
  })

  it('preserves a legacy hidden evidence operation during read-back', () => {
    expect(readEvidenceClaim({
      operation: 'positions_decimal',
      skill: 'addition',
      evidenceLevel: 2,
      level: 5
    })).toMatchObject({
      contentSkill: 'addition',
      skill: 'positions_decimal',
      level: 2
    })
  })
})

