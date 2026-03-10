import { describe, expect, it } from 'vitest'
import { getCurrentStreak } from './studentProfile'

function makeAttempts(count, values = {}) {
  return Array.from({ length: count }, () => ({ ...values }))
}

describe('getCurrentStreak', () => {
  it('reads streak from problemLog when available (not capped by recentProblems window)', () => {
    const profile = {
      recentProblems: makeAttempts(250, { correct: true }),
      problemLog: makeAttempts(320, { correct: true })
    }

    expect(getCurrentStreak(profile)).toBe(320)
  })

  it('treats partial answers as neutral for streak continuity', () => {
    const profile = {
      recentProblems: [],
      problemLog: [
        { correct: false },
        { correct: true },
        { correct: true, isPartial: true },
        { correct: true }
      ]
    }

    expect(getCurrentStreak(profile)).toBe(2)
  })
})
