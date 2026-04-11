import { describe, expect, it } from 'vitest'
import { addProblemResult, createStudentProfile, getCurrentStreak } from './studentProfile'

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

describe('addProblemResult', () => {
  it('preserves fraction correct answers as strings in stored history', () => {
    const profile = createStudentProfile('ELEV1', 'Ada', 4)
    const problem = {
      id: 'frac-1',
      domain: 'fractions',
      skill: 'fractions',
      level: 3,
      difficulty: { conceptual_level: 3 },
      values: { text: 'Förenkla: 2/4' },
      answer: {
        type: 'fraction',
        value: '1/2',
        num: 1,
        den: 2
      },
      metadata: {
        promptText: 'Förenkla: 2/4',
        requiresSimplifiedAnswer: true,
        skillTag: 'fractions_l3_simplify_focus'
      }
    }

    const { result } = addProblemResult(profile, problem, '1/2', 6, { rawAnswer: '1/2' })

    expect(result.correct).toBe(true)
    expect(result.correctAnswer).toBe('1/2')
    expect(result.absError).toBeNull()
    expect(result.relativeError).toBeNull()
    expect(profile.recentProblems[0].correctAnswer).toBe('1/2')
  })

  it('preserves algebra expression answers as strings in stored history', () => {
    const profile = createStudentProfile('ELEV2', 'Bea', 5)
    const problem = {
      id: 'alg-1',
      domain: 'algebra',
      skill: 'algebra_simplify',
      level: 2,
      difficulty: { conceptual_level: 2 },
      values: { expression: 'x + y' },
      answer: {
        type: 'expression',
        correct: 'x+y',
        alternatives: ['y+x']
      },
      metadata: {
        promptText: 'Förenkla: x + y',
        skillTag: 'algebra_simplify_l2'
      }
    }

    const { result } = addProblemResult(profile, problem, 'y+x', 8, { rawAnswer: 'y+x' })

    expect(result.correct).toBe(true)
    expect(result.correctAnswer).toBe('x+y')
    expect(result.absError).toBeNull()
    expect(result.relativeError).toBeNull()
    expect(profile.recentProblems[0].correctAnswer).toBe('x+y')
  })
})
