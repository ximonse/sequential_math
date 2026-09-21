import { describe, expect, it } from 'vitest'
import {
  buildAbsenceWarmupDecision,
  buildFocusedSessionStartPlan,
  getFocusedSessionStartDecision
} from './sessionStartDecision'

const DAY_MS = 24 * 60 * 60 * 1000

function problem(id, timestamp) {
  return {
    observationId: id,
    problemType: 'add_basic',
    timestamp
  }
}

describe('session start decisions', () => {
  it('creates a versioned introduction ramp for the first focused session', () => {
    const plan = buildFocusedSessionStartPlan({
      profile: { recentProblems: [] },
      operation: 'addition',
      destinationLevel: 5,
      frameId: 'session-1',
      now: 1000
    })

    expect(plan).toMatchObject({
      ruleVersion: 1,
      operation: 'addition',
      purpose: 'introduce',
      startLevel: 1,
      destinationLevel: 5,
      stepCount: 3
    })
    expect([0, 1, 2].map(count => getFocusedSessionStartDecision(plan, count).targetLevel))
      .toEqual([1, 2, 3])
    expect(getFocusedSessionStartDecision(plan, 3)).toBeNull()
  })

  it('ramps from below current need without leaving a locked range', () => {
    const plan = buildFocusedSessionStartPlan({
      profile: { recentProblems: [problem('old', 100)] },
      operation: 'addition',
      destinationLevel: 5,
      levelRange: [5, 5],
      progressionMode: 'steady',
      frameId: 'session-2',
      now: 2000
    })

    expect(plan).toMatchObject({ purpose: 'consolidate', startLevel: 5, stepCount: 4 })
    expect(getFocusedSessionStartDecision(plan, 0).targetLevel).toBe(5)
  })

  it('keeps absence warmup active for the existing two-to-four answer window', () => {
    const now = new Date(2026, 8, 21, 12, 0, 0).getTime()
    const old = problem('old', now - (3 * DAY_MS))
    const firstToday = problem('today-1', new Date(2026, 8, 21, 9, 0, 0).getTime())
    const base = {
      operation: 'addition',
      destinationLevel: 6,
      frameId: 'session-3',
      now
    }

    const first = buildAbsenceWarmupDecision({ profile: { recentProblems: [old] }, ...base })
    const second = buildAbsenceWarmupDecision({ profile: { recentProblems: [old, firstToday] }, ...base })

    expect(first).toMatchObject({
      ruleVersion: 1,
      purpose: 'consolidate',
      targetLevel: 4,
      stepNumber: 1,
      stepCount: 3
    })
    expect(second).toMatchObject({ targetLevel: 4, stepNumber: 2, stepCount: 3 })
  })
})
