import { describe, expect, it } from 'vitest'
import { getLevelFocusNextLevelAction, getSessionRules } from './sessionUtils'

function createProfile(recentProblems = [], adaptive = {}) {
  return {
    recentProblems,
    adaptive: {
      ...adaptive
    }
  }
}

function pushAttempts(target, problemType, level, attempts, correctAttempts = attempts) {
  const baseTs = Date.now() - 100000
  for (let i = 0; i < attempts; i += 1) {
    target.push({
      problemType,
      correct: i < correctAttempts,
      difficulty: {
        conceptual_level: level
      },
      timestamp: baseTs + i
    })
  }
}

describe('sessionUtils getSessionRules', () => {
  it('locks free training to global lowest unfinished level across domains', () => {
    const recent = []
    // Addition level 1 mastered -> floor becomes 2.
    pushAttempts(recent, 'add_basic', 1, 5, 5)
    const profile = createProfile(recent)

    const rules = getSessionRules(
      null,
      '',
      null,
      3,
      [],
      'challenge',
      null,
      ['addition', 'subtraction', 'multiplication'],
      profile
    )

    expect(rules.allowedTypes).toEqual(['subtraction'])
    expect(rules.startAtLowestUnmastered).toBe(true)
    expect(rules.lockToMasteryFloor).toBe(true)
    expect(rules.startReason).toBe('free_training_global_floor')
  })

  it('rotates between domains on the same global floor in free training', () => {
    const recent = []
    pushAttempts(recent, 'add_basic', 1, 5, 5)
    // Latest floor-level item is subtraction level 1, so next should rotate to multiplication.
    pushAttempts(recent, 'sub_basic', 1, 1, 1)
    const profile = createProfile(recent)

    const rules = getSessionRules(
      null,
      '',
      null,
      4,
      [],
      'steady',
      null,
      ['addition', 'subtraction', 'multiplication'],
      profile
    )

    expect(rules.allowedTypes).toEqual(['multiplication'])
    expect(rules.lockToMasteryFloor).toBe(true)
  })

  it('locks single-domain training to mastery floor, but not Framsteg level-focus', () => {
    const profile = createProfile([])

    const singleDomainRules = getSessionRules(
      null,
      'division',
      null,
      2,
      [],
      'challenge',
      null,
      [],
      profile
    )
    expect(singleDomainRules.allowedTypes).toEqual(['division'])
    expect(singleDomainRules.startAtLowestUnmastered).toBe(true)
    expect(singleDomainRules.lockToMasteryFloor).toBe(true)
    expect(singleDomainRules.startReason).toBe('single_domain_floor_lock')

    const levelFocusRules = getSessionRules(
      null,
      'division',
      null,
      2,
      [],
      'challenge',
      5,
      [],
      profile
    )
    expect(levelFocusRules.allowedTypes).toEqual(['division'])
    expect(levelFocusRules.forcedLevel).toBe(5)
    expect(levelFocusRules.lockToMasteryFloor).toBeUndefined()
    expect(levelFocusRules.startReason).toBeUndefined()
  })
})

describe('sessionUtils getLevelFocusNextLevelAction', () => {
  it('returns next-level action after declined advance in matching level-focus context', () => {
    const profile = createProfile([], {
      lastAdvanceOffer: {
        operation: 'addition',
        fromLevel: 1,
        nextLevel: 2,
        accepted: false
      }
    })

    const action = getLevelFocusNextLevelAction(profile, 'addition', 1)
    expect(action).toEqual({
      nextLevel: 2,
      label: 'Gå till nästa nivå'
    })
  })

  it('returns null when advance was accepted or mismatched', () => {
    const acceptedProfile = createProfile([], {
      lastAdvanceOffer: {
        operation: 'addition',
        fromLevel: 1,
        nextLevel: 2,
        accepted: true
      }
    })
    expect(getLevelFocusNextLevelAction(acceptedProfile, 'addition', 1)).toBeNull()

    const mismatchProfile = createProfile([], {
      lastAdvanceOffer: {
        operation: 'subtraction',
        fromLevel: 1,
        nextLevel: 2,
        accepted: false
      }
    })
    expect(getLevelFocusNextLevelAction(mismatchProfile, 'addition', 1)).toBeNull()
  })
})
