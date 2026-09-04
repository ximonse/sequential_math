import { describe, expect, it } from 'vitest'
import { deriveTeacherSummary, withFreshTeacherSummary } from './teacherSummary'

function result(index) {
  return {
    problemId: `problem-${index}`,
    operation: 'addition',
    skill: 'addition',
    level: 1,
    correct: index % 2 === 0,
    errorCategory: index % 2 === 0 ? 'none' : 'knowledge',
    speedTimeSec: 5,
    timestamp: Date.now() - 60_000
  }
}

describe('teacher summary', () => {
  it('uses the full problem log and mastery facts', () => {
    const problemLog = Array.from({ length: 300 }, (_, index) => result(index))
    const profile = {
      problemLog,
      recentProblems: problemLog.slice(-250),
      masteryFacts: {
        version: 1,
        facts: [{
          id: 'addition:1',
          operation: 'addition',
          level: 1,
          achievedAt: Date.now() - 120_000,
          window: { attempts: 10, correct: 9, rate: 0.9 },
          source: 'session'
        }],
        revokedIds: []
      }
    }

    const summary = deriveTeacherSummary(profile)

    expect(summary.weeklyActivity.attempts).toBe(300)
    expect(summary.operationStats7d.addition.attempts).toBe(300)
    expect(summary.effectiveLevels.addition).toBeGreaterThanOrEqual(1)
  })

  it('replaces stale summaries without mutating the source profile', () => {
    const profile = {
      problemLog: [],
      recentProblems: [],
      masteryFacts: { version: 1, facts: [], revokedIds: [] },
      teacherSummary: { weeklyActivity: { attempts: 999 } },
      effectiveLevels: { addition: 12 }
    }

    const fresh = withFreshTeacherSummary(profile)

    expect(fresh.teacherSummary.weeklyActivity.attempts).toBe(0)
    expect(fresh.effectiveLevels).toBeUndefined()
    expect(profile.teacherSummary.weeklyActivity.attempts).toBe(999)
  })
})
