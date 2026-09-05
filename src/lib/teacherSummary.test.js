import { describe, expect, it } from 'vitest'
import { deriveTeacherSummary, getCurrentWeekTeacherEvidence, withFreshTeacherSummary } from './teacherSummary'

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
    expect(summary.currentWeek.attempts).toBe(300)
    expect(summary.currentWeek.speedSamples).toBe(300)
    expect(summary.evidence).toMatchObject({
      historySource: 'problemLog',
      historyComplete: true,
      sourceAttempts: 300
    })
    expect(getCurrentWeekTeacherEvidence(
      { teacherSummary: summary },
      summary.currentWeek.periodStart
    )?.accuracy).toBe(0.5)
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

  it('marks a recent-only history as limited evidence', () => {
    const recentProblems = Array.from({ length: 12 }, (_, index) => result(index))
    const profile = {
      recentProblems,
      masteryFacts: { version: 1, facts: [], revokedIds: [] }
    }

    const summary = deriveTeacherSummary(profile)
    const evidence = getCurrentWeekTeacherEvidence(
      { teacherSummary: summary },
      summary.currentWeek.periodStart
    )

    expect(evidence).toMatchObject({
      attempts: 12,
      correct: 6,
      historyComplete: false,
      historySource: 'recentProblems'
    })
    expect(getCurrentWeekTeacherEvidence(
      { teacherSummary: summary },
      summary.currentWeek.periodStart - 1
    )).toBeNull()
  })
})
