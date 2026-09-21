import { describe, expect, it, vi } from 'vitest'
import { addProblemResult, createStudentProfile, getCurrentStreak } from './studentProfile'
import { computeOperationLevelMasteryStatus } from './masteryCalculation'
import { createTableProblem } from '../components/student/session/sessionUtils'
import { selectNextProblemForProfile } from '../engine/adaptiveEngine'

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
  it('stores decimal problems under the hidden decimal evidence skill and level', () => {
    const profile = createStudentProfile('ELEV3', 'Cia', 5)
    const problem = { id: 'decimal-1', domain: 'arithmetic', skill: 'addition', level: 4, type: 'addition', values: { a: 1.2, b: 3.4 }, result: 4.6, difficulty: { conceptual_level: 4 }, metadata: { evidenceSkill: 'positions_decimal', evidenceLevel: 1 } }
    const { result } = addProblemResult(profile, problem, 4.6, 6, { rawAnswer: '4.6' })
    expect(result.operation).toBe('positions_decimal')
    expect(result.evidenceSkill).toBe('positions_decimal')
    expect(result.evidenceLevel).toBe(1)
    expect(result.evidenceClass).toBe('mastery_eligible')
    expect(result.contentSkill).toBe('addition')
    expect(result.observationId).toContain('decimal-1:')
  })

  it('stores the training frame with each answer observation', () => {
    const profile = createStudentProfile('ELEV5', 'Eli', 5)
    const problem = { id: 'add-1', domain: 'arithmetic', skill: 'addition', level: 2, type: 'addition', values: { a: 2, b: 3 }, result: 5, difficulty: { conceptual_level: 2 } }
    const trainingContext = {
      version: 1,
      frameId: 'session-1',
      mode: 'teacher_locked',
      source: 'teacher_assignment',
      assignmentId: 'asg-1',
      assignmentKind: 'standard',
      allowedSkills: ['addition'],
      levelRange: [2, 2],
      tableSet: [],
      progressionMode: 'steady'
    }

    const { result } = addProblemResult(profile, problem, 5, 3, {
      rawAnswer: '5',
      trainingContext
    })

    expect(result.trainingMode).toBe('teacher_locked')
    expect(result.trainingContext).toEqual(trainingContext)
    expect(profile.problemLog[0].trainingContext).toEqual(trainingContext)
  })

  it('stores table-drill answers without creating general multiplication mastery', () => {
    const profile = createStudentProfile('ELEV4', 'Dea', 5)
    for (let index = 0; index < 5; index += 1) {
      const problem = createTableProblem({ table: 7, factor: index + 1 })
      const { result } = addProblemResult(profile, problem, problem.result, 4, {
        rawAnswer: String(problem.result)
      })
      expect(result.evidenceClass).toBe('practice_only')
    }

    expect(computeOperationLevelMasteryStatus(
      profile.problemLog,
      'multiplication',
      4
    ).attempts).toBe(0)
    expect(profile.masteryFacts.facts).toEqual([])
  })

  it('creates one automatic progression decision from the mastery event', () => {
    const profile = createStudentProfile('ELEV6', 'Fia', 5)
    const trainingContext = {
      version: 1,
      frameId: 'session-mastery',
      mode: 'area_focus',
      source: 'student_focus',
      assignmentId: '',
      assignmentKind: '',
      allowedSkills: ['addition'],
      levelRange: null,
      tableSet: [],
      progressionMode: 'steady'
    }
    for (let index = 0; index < 5; index += 1) {
      const prerequisite = {
        id: `add-prerequisite-${index}`,
        domain: 'arithmetic',
        skill: 'addition',
        type: 'addition',
        level: 1,
        values: { a: 2, b: 3 },
        result: 5,
        difficulty: { conceptual_level: 1 }
      }
      addProblemResult(profile, prerequisite, 5, 3, {
        rawAnswer: '5',
        trainingContext
      })
    }
    let finalEntries = []
    for (let index = 0; index < 5; index += 1) {
      const problem = {
        id: `add-mastery-${index}`,
        domain: 'arithmetic',
        skill: 'addition',
        type: 'addition',
        level: 2,
        values: { a: 2, b: 3 },
        result: 5,
        difficulty: { conceptual_level: 2 }
      }
      finalEntries = addProblemResult(profile, problem, 5, 3, {
        rawAnswer: '5',
        trainingContext
      }).walEntries
    }

    expect(finalEntries.map(entry => entry.type)).toEqual([
      'problem_result',
      'mastery_achieved',
      'adaptation_decision'
    ])
    expect(profile.adaptive.lastDecision).toMatchObject({
      action: 'advance',
      operation: 'addition',
      fromLevel: 2,
      nextLevel: 3,
      frameId: 'session-mastery'
    })
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    try {
      const nextProblem = selectNextProblemForProfile(profile, {
        allowedTypes: ['addition']
      })
      expect(nextProblem.level).toBe(3)
    } finally {
      random.mockRestore()
    }
  })

})


describe('mastery partial-answer policy', () => {
  it('does not count partial answers toward level mastery', () => {
    const attempts = Array.from({ length: 5 }, (_, index) => ({
      operation: 'fractions', level: 1, difficulty: { conceptual_level: 1 }, correct: true, isPartial: index === 0
    }))
    const status = computeOperationLevelMasteryStatus(attempts, 'fractions', 1)
    expect(status.correct).toBe(4)
    expect(status.isMastered).toBe(false)
  })
})
