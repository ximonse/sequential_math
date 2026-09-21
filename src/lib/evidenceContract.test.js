import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_CLASSES,
  attachEvidenceClaim,
  classifyEvidenceRecord,
  isMasteryEligible,
  readEvidenceClaim,
  summarizeEvidenceHistory
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

  it('does not invent mastery evidence for unclassifiable legacy entries', () => {
    expect(readEvidenceClaim({ problemId: 'legacy-unknown' }).class)
      .toBe(EVIDENCE_CLASSES.INVALID)
    expect(isMasteryEligible({ problemId: 'legacy-unknown' })).toBe(false)
  })

  it('separates contract evidence, classifiable legacy data and unknown history', () => {
    const contract = attachEvidenceClaim({ skill: 'addition', level: 2 })
    const legacy = { operation: 'subtraction', level: 2 }
    const unknown = { problemId: 'legacy-unknown' }

    expect(classifyEvidenceRecord(contract).provenance).toBe('contract')
    expect(classifyEvidenceRecord(legacy).provenance).toBe('legacy_inferred')
    expect(classifyEvidenceRecord(unknown).provenance).toBe('unknown')
    expect(summarizeEvidenceHistory([contract, legacy, unknown])).toMatchObject({
      total: 3,
      contract: 1,
      legacyClassified: 1,
      unknown: 1,
      masteryEligible: 2
    })
  })
})
