import { describe, expect, it } from 'vitest'
import { createTableQueue, getSessionRules, recordTableCompletion } from './sessionUtils'
import { buildFocusedSessionStartPlan } from '../../../lib/sessionStartDecision'

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
  it('picks each domain at its own mastery floor in free training (per-domain rotation)', () => {
    const recent = []
    // Addition level 1 mastered — addition will train at level 2.
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

    // Last recent problem was addition → rotate to subtraction.
    expect(rules.allowedTypes).toEqual(['subtraction'])
    expect(rules.startAtLowestUnmastered).toBe(true)
    expect(rules.lockToMasteryFloor).toBe(true)
    expect(rules.startReason).toBe('free_training_per_domain')
  })

  it('rotates between all domains equally in free training', () => {
    const recent = []
    pushAttempts(recent, 'add_basic', 1, 5, 5)
    // Latest problem is subtraction → next should rotate to multiplication.
    pushAttempts(recent, 'sub_basic', 1, 1, 1)
    const profile = createProfile(recent)

    const rules = getSessionRules(
      null,
      '',
      null,
      4,
      [],
      'challenge',
      null,
      ['addition', 'subtraction', 'multiplication'],
      profile
    )

    expect(rules.allowedTypes).toEqual(['multiplication'])
    expect(rules.lockToMasteryFloor).toBe(true)
    expect(rules.startReason).toBe('free_training_per_domain')
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

  it('turns a focused start plan into a traceable training decision', () => {
    const profile = createProfile([])
    const plan = buildFocusedSessionStartPlan({
      profile,
      operation: 'addition',
      destinationLevel: 4,
      frameId: 'session-start',
      now: 1000
    })

    const rules = getSessionRules(
      null,
      'addition',
      plan,
      1,
      [],
      'challenge',
      null,
      [],
      profile,
      'session-start'
    )

    expect(rules).toMatchObject({
      forcedLevel: 2,
      forcedType: 'addition',
      trainingDecisionRuleVersion: 1,
      trainingPurpose: 'introduce',
      trainingReasonCodes: ['first_operation_session', 'introduce_from_foundation']
    })
    expect(rules.trainingDecisionId).toContain('session-start')
  })

  it('lets an active recovery need take priority over the focused start plan', () => {
    const profile = createProfile([], {
      currentNeeds: {
        addition: {
          needId: 'need:recover:v1',
          ruleVersion: 1,
          operation: 'addition',
          purpose: 'recover',
          targetLevel: 2,
          reasonCodes: ['consecutive_errors'],
          frameId: 'session-recover',
          trainingMode: 'area_focus',
          assignmentId: '',
          evidenceObservationIds: ['answer-3'],
          decidedAt: 1000
        }
      }
    })
    const plan = buildFocusedSessionStartPlan({
      profile,
      operation: 'addition',
      destinationLevel: 4,
      frameId: 'session-recover',
      now: 2000
    })

    const rules = getSessionRules(
      null,
      'addition',
      plan,
      0,
      [],
      'challenge',
      null,
      [],
      profile,
      'session-recover'
    )

    expect(rules.forcedLevel).toBeUndefined()
    expect(rules.lockToMasteryFloor).toBe(true)
  })
})

describe('sessionUtils table evidence', () => {
  it('stores table completion separately without creating multiplication level mastery', () => {
    const profile = { masteryFacts: { version: 1, facts: [], revokedIds: [] } }

    expect(recordTableCompletion(profile, 7)).toBe(1)
    expect(profile.tableDrill.completions).toHaveLength(1)
    expect(profile.masteryFacts.facts).toEqual([])
  })
})

describe('tabellkön', () => {
  it('håller sig i vald tabell och undviker tvåsiffriga faktorer', () => {
    const queue = createTableQueue([7])
    expect(queue.length).toBe(10)
    expect(queue.every(item => item.table === 7)).toBe(true)
    expect(queue.every(item => item.factor >= 1 && item.factor <= 10)).toBe(true)
  })
})
