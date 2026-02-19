import { describe, expect, it } from 'vitest'
import {
  buildAnalyticsSnapshot,
  buildDetailedProblemExportRows,
  buildSkillComparisonExportRows
} from './teacherAnalytics'

function createBaseProblem(overrides = {}) {
  return {
    timestamp: Date.now(),
    problemType: 'AS3',
    skillTag: 'AS3',
    difficulty: { conceptual_level: 2 },
    correct: true,
    errorCategory: 'none',
    isInattentionError: false,
    isKnowledgeError: false,
    isReasonable: true,
    timeSpent: 12,
    speedTimeSec: 12,
    excludedFromSpeed: false,
    speedExclusionReason: '',
    interruptionSuspected: false,
    hiddenDurationSec: 0,
    progressionMode: 'challenge',
    selectionReason: 'normal',
    difficultyBucket: 'core',
    targetLevel: 2,
    abilityBefore: 2,
    carryCount: 0,
    borrowCount: 0,
    termOrder: 'equal',
    values: { a: 48, b: 24 },
    ...overrides
  }
}

function createProfile(problemLog) {
  return {
    studentId: 'S1',
    name: 'Testelev',
    className: '4A',
    problemLog,
    recentProblems: []
  }
}

describe('teacherAnalytics NCM fields', () => {
  it('adds NCM metadata to detailed export rows when code exists', () => {
    const snapshot = buildAnalyticsSnapshot([createProfile([createBaseProblem()])])
    const rows = buildDetailedProblemExportRows(snapshot)
    expect(rows).toHaveLength(1)
    expect(rows[0].NCMKod).toBe('AS3')
    expect(rows[0].NCMDomän).toBe('arithmetic')
    expect(rows[0].NCMOperation).toBe('mixed')
    expect(rows[0].NCMFörmågor).toContain('ncm_word_problem')
  })

  it('adds NCM metadata to skill comparison rows', () => {
    const snapshot = buildAnalyticsSnapshot([
      createProfile([
        createBaseProblem({ correct: true, timestamp: Date.now() - 2000 }),
        createBaseProblem({ correct: false, errorCategory: 'knowledge', timestamp: Date.now() - 1000 })
      ])
    ])
    const rows = buildSkillComparisonExportRows(snapshot)
    expect(rows).toHaveLength(1)
    expect(rows[0].NCMKod).toBe('AS3')
    expect(rows[0].NCMDomän).toBe('arithmetic')
    expect(rows[0].NCMFörmågor).toContain('op_addition')
  })

  it('keeps NCM fields empty for ordinary internal templates', () => {
    const snapshot = buildAnalyticsSnapshot([
      createProfile([
        createBaseProblem({
          problemType: 'add_1d_1d_no_carry',
          skillTag: 'add_1d_1d_no_carry',
          values: { a: 4, b: 3 }
        })
      ])
    ])
    const rows = buildDetailedProblemExportRows(snapshot)
    expect(rows[0].NCMKod).toBe('')
    expect(rows[0].NCMDomän).toBe('')
  })
})
