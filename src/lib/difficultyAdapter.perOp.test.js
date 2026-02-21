import { describe, expect, it } from 'vitest'
import {
  adjustDifficulty,
  selectNextProblem,
  getOperationAbility,
  setOperationAbility,
  getRecentOperationSuccessRate,
  getConsecutiveOperationErrors
} from './difficultyAdapter'

function createProfile(overrides = {}) {
  return {
    currentDifficulty: overrides.currentDifficulty ?? 6,
    highestDifficulty: overrides.highestDifficulty ?? (overrides.currentDifficulty ?? 6),
    recentProblems: overrides.recentProblems ?? [],
    adaptive: {
      skillStates: {},
      recentSelections: [],
      ...(overrides.adaptive || {})
    }
  }
}

function addCorrectProblem(profile, type = 'add_basic') {
  profile.recentProblems.push({
    problemType: type,
    correct: true,
    isReasonable: true,
    timestamp: Date.now(),
    timeSpent: 5,
    speedTimeSec: 5,
    difficulty: { conceptual_level: profile.currentDifficulty }
  })
}

function addWrongProblem(profile, type = 'add_basic') {
  profile.recentProblems.push({
    problemType: type,
    correct: false,
    isReasonable: false,
    timestamp: Date.now(),
    timeSpent: 10,
    speedTimeSec: 10,
    difficulty: { conceptual_level: profile.currentDifficulty }
  })
}

describe('Per-operation difficulty: seeding', () => {
  it('seeds operationAbilities from currentDifficulty for new profile', () => {
    const profile = createProfile({ currentDifficulty: 8 })

    // Trigger ensureDifficultyMeta via getOperationAbility
    expect(getOperationAbility(profile, 'addition')).toBe(8)
    expect(getOperationAbility(profile, 'subtraction')).toBe(6)
    expect(getOperationAbility(profile, 'multiplication')).toBe(5)
    expect(getOperationAbility(profile, 'division')).toBe(4)
  })

  it('seeds operationAbilities for low currentDifficulty with correct clamping', () => {
    const profile = createProfile({ currentDifficulty: 2 })

    expect(getOperationAbility(profile, 'addition')).toBe(2)
    expect(getOperationAbility(profile, 'subtraction')).toBe(1)    // max(1, 2-2)
    expect(getOperationAbility(profile, 'multiplication')).toBe(1) // max(1, 2-3)
    expect(getOperationAbility(profile, 'division')).toBe(3)       // max(3, 2-4)
  })

  it('seeds existing profile without operationAbilities on first call', () => {
    const profile = createProfile({ currentDifficulty: 5 })
    // Simulate old profile with adaptive but no operationAbilities
    profile.adaptive = { skillStates: {}, recentSelections: [] }

    const ability = getOperationAbility(profile, 'addition')
    expect(ability).toBe(5)
    expect(profile.adaptive.operationAbilities).toBeDefined()
    expect(profile.adaptive.operationAbilities.subtraction).toBe(3)
  })

  it('does not overwrite existing operationAbilities', () => {
    const profile = createProfile({ currentDifficulty: 6 })
    profile.adaptive.operationAbilities = {
      addition: 9,
      subtraction: 7,
      multiplication: 5,
      division: 3
    }

    expect(getOperationAbility(profile, 'addition')).toBe(9)
    expect(getOperationAbility(profile, 'subtraction')).toBe(7)
  })
})

describe('Per-operation difficulty: selectNextProblem', () => {
  it('uses per-operation ability for problem level', () => {
    const profile = createProfile({ currentDifficulty: 8 })
    // Set very different abilities
    profile.adaptive.operationAbilities = {
      addition: 10,
      subtraction: 3,
      multiplication: 5,
      division: 3
    }
    // Enough history for stable generation
    for (let i = 0; i < 20; i++) addCorrectProblem(profile, 'add_basic')

    // Force addition with allowedTypes to control type selection
    const problem = selectNextProblem(profile, { allowedTypes: ['addition'] })
    // Target level should be around 10 (addition ability), not 8 (global)
    const targetLevel = problem.metadata?.targetLevel
    expect(targetLevel).toBeGreaterThanOrEqual(8)
    expect(targetLevel).toBeLessThanOrEqual(12)
  })

  it('uses subtraction ability when subtraction is selected', () => {
    const profile = createProfile({ currentDifficulty: 8 })
    profile.adaptive.operationAbilities = {
      addition: 10,
      subtraction: 3,
      multiplication: 5,
      division: 3
    }
    for (let i = 0; i < 20; i++) addCorrectProblem(profile, 'sub_basic')

    const problem = selectNextProblem(profile, { allowedTypes: ['subtraction'] })
    const targetLevel = problem.metadata?.targetLevel
    // Should be around 3 (subtraction ability), not 8 (global)
    expect(targetLevel).toBeGreaterThanOrEqual(1)
    expect(targetLevel).toBeLessThanOrEqual(5)
  })
})

describe('Per-operation difficulty: adjustDifficulty', () => {
  it('updates correct operation ability after correct answer', () => {
    const profile = createProfile({ currentDifficulty: 6 })
    profile.adaptive.operationAbilities = {
      addition: 6,
      subtraction: 4,
      multiplication: 3,
      division: 3
    }
    // Add enough correct subtraction problems to trigger upStreak
    addCorrectProblem(profile, 'sub_basic')
    addCorrectProblem(profile, 'sub_basic')

    const subBefore = getOperationAbility(profile, 'subtraction')
    const addBefore = getOperationAbility(profile, 'addition')
    adjustDifficulty(profile, true)
    const subAfter = getOperationAbility(profile, 'subtraction')
    const addAfter = getOperationAbility(profile, 'addition')

    // Subtraction (latest operation) should have increased
    expect(subAfter).toBeGreaterThan(subBefore)
    // Addition should be unchanged
    expect(addAfter).toBe(addBefore)
  })

  it('global difficulty adjusts with reduced delta (50%)', () => {
    const profile = createProfile({ currentDifficulty: 6 })
    profile.adaptive.operationAbilities = {
      addition: 6,
      subtraction: 4,
      multiplication: 3,
      division: 3
    }
    addCorrectProblem(profile, 'sub_basic')
    addCorrectProblem(profile, 'sub_basic')

    const globalBefore = profile.currentDifficulty
    const subBefore = getOperationAbility(profile, 'subtraction')
    adjustDifficulty(profile, true)
    const globalDelta = profile.currentDifficulty - globalBefore
    const subDelta = getOperationAbility(profile, 'subtraction') - subBefore

    // Global delta should be roughly half of operation delta
    if (subDelta > 0) {
      expect(Math.abs(globalDelta / subDelta - 0.5)).toBeLessThan(0.01)
    }
  })

  it('decreases operation ability on wrong answer', () => {
    const profile = createProfile({ currentDifficulty: 6 })
    profile.adaptive.operationAbilities = {
      addition: 6,
      subtraction: 4,
      multiplication: 3,
      division: 3
    }
    addWrongProblem(profile, 'mul_basic')
    addWrongProblem(profile, 'mul_basic')

    const mulBefore = getOperationAbility(profile, 'multiplication')
    adjustDifficulty(profile, false)
    const mulAfter = getOperationAbility(profile, 'multiplication')

    expect(mulAfter).toBeLessThan(mulBefore)
  })
})

describe('Per-operation difficulty: chooseProblemType gating preserved', () => {
  it('only selects addition when global difficulty is low', () => {
    const profile = createProfile({ currentDifficulty: 2 })
    // Give addition a high ability but keep global low
    profile.adaptive.operationAbilities = {
      addition: 8,
      subtraction: 1,
      multiplication: 1,
      division: 3
    }
    for (let i = 0; i < 20; i++) addCorrectProblem(profile, 'add_basic')

    // Run 30 selections — with global difficulty at 2, only addition should be chosen
    const types = new Set()
    for (let i = 0; i < 30; i++) {
      const problem = selectNextProblem(profile, {})
      types.add(problem.type)
    }

    expect(types.has('addition')).toBe(true)
    expect(types.has('subtraction')).toBe(false)
    expect(types.has('multiplication')).toBe(false)
    expect(types.has('division')).toBe(false)
  })
})

describe('Per-operation helpers', () => {
  it('getRecentOperationSuccessRate returns rate for specific operation', () => {
    const profile = createProfile({ currentDifficulty: 6 })
    addCorrectProblem(profile, 'add_basic')
    addCorrectProblem(profile, 'add_basic')
    addWrongProblem(profile, 'sub_basic')
    addWrongProblem(profile, 'sub_basic')

    expect(getRecentOperationSuccessRate(profile, 'addition', 5)).toBe(1.0)
    expect(getRecentOperationSuccessRate(profile, 'subtraction', 5)).toBe(0)
  })

  it('getConsecutiveOperationErrors counts only operation-specific errors', () => {
    const profile = createProfile({ currentDifficulty: 6 })
    addCorrectProblem(profile, 'sub_basic')   // sub: correct — breaks streak
    addCorrectProblem(profile, 'add_basic')   // add: ignored for sub counting
    addWrongProblem(profile, 'sub_basic')     // sub: wrong
    addWrongProblem(profile, 'sub_basic')     // sub: wrong

    expect(getConsecutiveOperationErrors(profile, 'subtraction')).toBe(2)
    expect(getConsecutiveOperationErrors(profile, 'addition')).toBe(0)
  })

  it('setOperationAbility clamps values to 1-12', () => {
    const profile = createProfile({ currentDifficulty: 6 })
    setOperationAbility(profile, 'addition', 15)
    expect(getOperationAbility(profile, 'addition')).toBe(12)

    setOperationAbility(profile, 'addition', -3)
    expect(getOperationAbility(profile, 'addition')).toBe(1)
  })

  it('getOperationAbility falls back to currentDifficulty for unknown operation', () => {
    const profile = createProfile({ currentDifficulty: 7 })
    expect(getOperationAbility(profile, 'unknown_op')).toBe(7)
  })
})
