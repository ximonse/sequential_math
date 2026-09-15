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
})

