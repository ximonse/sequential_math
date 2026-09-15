import { describe, expect, it } from 'vitest'
import { resolveScopedSelection } from './scopedSelection'

function profile(recentProblems = []) {
  return {
    currentDifficulty: 1,
    recentProblems,
    problemLog: [],
    adaptive: { skillStates: {}, recentSelections: [] }
  }
}

describe('resolveScopedSelection', () => {
  it('resolves a scoped skill through the registry and respects its level range', () => {
    const selection = resolveScopedSelection(profile(), {
      allowedTypes: ['fractions'],
      levelRange: [4, 6]
    })
    expect(selection.domain.id).toBe('fractions')
    expect(selection.skill).toBe('fractions')
    expect(selection.level).toBe(4)
  })

  it('rotates a mixed scope from the last relevant skill', () => {
    const selection = resolveScopedSelection(profile([{
      skill: 'fractions',
      domain: 'fractions',
      correct: true,
      difficulty: { conceptual_level: 1 }
    }]), {
      allowedTypes: ['fractions', 'percentage']
    })
    expect(selection.skill).toBe('percentage')
    expect(selection.domain.id).toBe('percentage')
  })

  it('clamps a forced level to the scoped range', () => {
    const selection = resolveScopedSelection(profile(), {
      allowedTypes: ['algebra_evaluate'],
      levelRange: [5, 7],
      forcedLevel: 12
    })
    expect(selection.level).toBe(7)
  })

  it('rejects an unknown or out-of-scope skill', () => {
    expect(() => resolveScopedSelection(profile(), {
      allowedTypes: ['unknown_skill']
    })).toThrow('Unknown training skill')

    expect(() => resolveScopedSelection(profile(), {
      allowedTypes: ['fractions'],
      forcedType: 'percentage'
    })).toThrow('outside training scope')
  })

  it('rotates mixed arithmetic sessions from the parent skill of hidden evidence', () => {
    const selection = resolveScopedSelection(profile([{
      skill: 'addition',
      operation: 'positions_decimal',
      correct: true
    }]), { allowedTypes: ['addition', 'subtraction'] })
    expect(selection.skill).toBe('subtraction')
  })
})

