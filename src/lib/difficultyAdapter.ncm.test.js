import { describe, expect, it } from 'vitest'
import { selectNextProblem } from './difficultyAdapter'

function createProfile() {
  return {
    currentDifficulty: 6,
    highestDifficulty: 6,
    recentProblems: [],
    adaptive: {
      skillStates: {},
      recentSelections: []
    }
  }
}

describe('difficultyAdapter NCM rotation', () => {
  it('cycles through all AS1 items before repeating', () => {
    const profile = createProfile()
    const picked = []

    for (let i = 0; i < 5; i += 1) {
      const problem = selectNextProblem(profile, {
        ncmFilter: { codes: ['AS1'] }
      })
      picked.push(String(problem.metadata?.skillTag || ''))
    }

    expect(new Set(picked).size).toBe(5)

    const sixth = selectNextProblem(profile, {
      ncmFilter: { codes: ['AS1'] }
    })
    expect(picked).toContain(String(sixth.metadata?.skillTag || ''))
  })

  it('avoids immediate consecutive repeats when multiple NCM items are available', () => {
    const profile = createProfile()
    const picked = []

    for (let i = 0; i < 12; i += 1) {
      const problem = selectNextProblem(profile, {
        ncmFilter: { codes: ['AS1'] }
      })
      picked.push(String(problem.metadata?.skillTag || ''))
    }

    for (let i = 1; i < picked.length; i += 1) {
      expect(picked[i]).not.toBe(picked[i - 1])
    }
  })

  it('respects explicit preferred NCM skill from session', () => {
    const profile = createProfile()
    const preferredSkillTag = 'ncm_sa2_item_4'
    const problem = selectNextProblem(profile, {
      ncmFilter: { codes: ['SA2'] },
      ncmPreferredSkillTag: preferredSkillTag
    })
    expect(problem.metadata?.skillTag).toBe(preferredSkillTag)
  })
})
