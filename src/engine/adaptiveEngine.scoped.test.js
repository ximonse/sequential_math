import { describe, expect, it } from 'vitest'
import { selectNextProblemForProfile, selectNextSkillAndLevel } from './adaptiveEngine'

function profile(recentProblems = []) {
  return {
    currentDifficulty: 1,
    recentProblems,
    problemLog: [],
    adaptive: { skillStates: {}, recentSelections: [] }
  }
}

function currentNeed(purpose, targetLevel) {
  return {
    needId: `need:${purpose}:v1`,
    ruleVersion: 1,
    operation: 'addition',
    purpose,
    targetLevel,
    reasonCodes: ['test_need'],
    frameId: 'session-need',
    trainingMode: 'area_focus',
    assignmentId: '',
    evidenceObservationIds: ['answer-old'],
    decidedAt: Date.now() - 1000
  }
}

describe('adaptive engine scoped selection', () => {
  it('routes registered single-skill sessions through their domain', () => {
    const cases = [
      ['addition', 'arithmetic'],
      ['algebra_evaluate', 'algebra'],
      ['arithmetic_expressions', 'arithmetic_expressions'],
      ['fractions', 'fractions'],
      ['percentage', 'percentage']
    ]

    for (const [skill, domain] of cases) {
      const problem = selectNextProblemForProfile(profile(), {
        allowedTypes: [skill],
        forcedLevel: 4
      })
      expect(problem.domain).toBe(domain)
      expect(problem.skill).toBe(skill)
      expect(problem.level).toBe(4)
    }
  })

  it('rotates a mixed cross-domain assignment without falling back to arithmetic', () => {
    const problem = selectNextProblemForProfile(profile([{
      domain: 'fractions',
      skill: 'fractions',
      correct: true
    }]), {
      allowedTypes: ['fractions', 'percentage'],
      forcedLevel: 4
    })

    expect(problem.domain).toBe('percentage')
    expect(problem.skill).toBe('percentage')
  })

  it('supports mixed arithmetic and non-arithmetic scopes', () => {
    const problem = selectNextProblemForProfile(profile([{
      domain: 'fractions',
      skill: 'fractions',
      correct: true
    }]), {
      allowedTypes: ['addition', 'fractions'],
      forcedLevel: 3
    })

    expect(problem.domain).toBe('arithmetic')
    expect(problem.skill).toBe('addition')
  })

  it('uses the same scoped range contract for progress-level selection', () => {
    const selection = selectNextSkillAndLevel(profile(), {
      allowedTypes: ['percentage'],
      levelRange: [5, 7],
      forcedLevel: 12
    })
    const problem = selectNextProblemForProfile(profile(), {
      allowedTypes: ['percentage'],
      levelRange: [5, 7],
      forcedLevel: 12
    })

    expect(selection).toEqual({
      domain: 'percentage',
      skill: 'percentage',
      level: 7
    })
    expect(problem.level).toBe(7)
  })

  it('carries a versioned session-start decision into the generated problem', () => {
    const problem = selectNextProblemForProfile(profile(), {
      allowedTypes: ['addition'],
      forcedLevel: 2,
      forceReason: 'first_operation_session',
      trainingDecisionId: 'start:session-1:addition:1000:v1:step:1',
      trainingDecisionRuleVersion: 1,
      trainingPurpose: 'introduce',
      trainingReasonCodes: ['first_operation_session', 'introduce_from_foundation']
    })

    expect(problem.level).toBe(2)
    expect(problem.metadata).toMatchObject({
      selectionReason: 'first_operation_session',
      targetLevel: 2,
      trainingDecisionId: 'start:session-1:addition:1000:v1:step:1',
      trainingDecisionRuleVersion: 1,
      trainingPurpose: 'introduce',
      trainingReasonCodes: ['first_operation_session', 'introduce_from_foundation']
    })
  })

  it('uses a versioned absence warmup without losing its reason', () => {
    const oldTimestamp = Date.now() - (3 * 24 * 60 * 60 * 1000)
    const student = profile([{
      observationId: 'answer-old',
      problemType: 'add_basic',
      correct: true,
      timestamp: oldTimestamp
    }])
    student.adaptive.currentNeeds = { addition: currentNeed('consolidate', 6) }

    const problem = selectNextProblemForProfile(student, {
      allowedTypes: ['addition'],
      frameId: 'session-return'
    })

    expect(problem.level).toBe(4)
    expect(problem.metadata).toMatchObject({
      selectionReason: 'return_after_absence',
      targetLevel: 4,
      trainingDecisionRuleVersion: 1,
      trainingPurpose: 'consolidate'
    })
    expect(problem.metadata.trainingDecisionId).toContain('start:absence:session-return:addition')
  })

  it('does not apply the legacy error relief on top of a recovery decision', () => {
    const errors = Array.from({ length: 3 }, (_, index) => ({
      observationId: `answer-${index + 1}`,
      problemType: 'add_basic',
      correct: false,
      timestamp: Date.now() - (3000 - index)
    }))
    const student = profile(errors)
    student.adaptive.currentNeeds = { addition: currentNeed('recover', 3) }

    const problem = selectNextProblemForProfile(student, { allowedTypes: ['addition'] })

    expect(problem.level).toBe(3)
    expect(problem.metadata).toMatchObject({
      trainingDecisionId: 'need:recover:v1',
      trainingPurpose: 'recover',
      targetLevel: 3
    })
  })

  it('keeps expression and word-based NCM assignments playable through the guardian', () => {
    for (const code of ['AS1', 'AS3', 'RP5', 'SA2']) {
      const problem = selectNextProblemForProfile(profile(), {
        ncmFilter: { codes: [code] }
      })

      expect(problem.metadata.promptText, code).toBeTruthy()
      expect(problem.answer.type, code).toBe('number')
      expect(problem.metadata.evidenceClass, code).not.toBe('invalid')
      expect(problem.metadata.contentVerificationMode, code).toBe(
        code === 'AS1' ? 'independent_expression' : 'external_facit'
      )
    }
  })
})

