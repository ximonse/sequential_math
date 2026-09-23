import { describe, expect, it } from 'vitest'
import {
  ADAPTATION_ACTIONS,
  ADAPTATION_DECISION_RULE_VERSION,
  buildMasteryProgressionDecision,
  isValidAdaptationDecision,
  recordAdaptationDecision
} from './adaptationDecision'
import { buildTrainingContext } from './trainingContext'

function mastery(level = 3) {
  return {
    operation: 'addition',
    level,
    achievedAt: 1234,
    evidenceObservationIds: ['answer-1', 'answer-2']
  }
}

describe('mastery progression decision', () => {
  it('automatically advances after mastery in student focus', () => {
    const decision = buildMasteryProgressionDecision({
      mastery: mastery(),
      trainingContext: buildTrainingContext({
        sessionId: 'session-1',
        mode: 'addition',
        fixedLevel: 3
      })
    })

    expect(decision).toMatchObject({
      ruleVersion: ADAPTATION_DECISION_RULE_VERSION,
      action: ADAPTATION_ACTIONS.ADVANCE,
      purpose: 'challenge',
      operation: 'addition',
      fromLevel: 3,
      nextLevel: 4,
      frameId: 'session-1',
      trainingMode: 'level_focus',
      evidenceObservationIds: ['answer-1', 'answer-2']
    })
    expect(isValidAdaptationDecision(decision)).toBe(true)
  })

  it('holds a teacher-locked frame instead of escaping it', () => {
    const decision = buildMasteryProgressionDecision({
      mastery: mastery(),
      trainingContext: buildTrainingContext({
        sessionId: 'session-2',
        assignment: {
          id: 'assignment-1',
          kind: 'standard',
          problemTypes: ['addition'],
          minLevel: 3,
          maxLevel: 3
        }
      })
    })

    expect(decision).toMatchObject({
      action: ADAPTATION_ACTIONS.HOLD_FRAME,
      purpose: 'consolidate',
      nextLevel: null,
      trainingMode: 'teacher_locked',
      assignmentId: 'assignment-1',
      reasonCodes: ['mastery_achieved', 'teacher_frame_boundary']
    })
  })

  it('marks the domain complete at level 12', () => {
    expect(buildMasteryProgressionDecision({ mastery: mastery(12) })).toMatchObject({
      action: ADAPTATION_ACTIONS.COMPLETE_DOMAIN,
      fromLevel: 12,
      nextLevel: null
    })
  })

  it('marks geometry complete at its own ceiling instead of promising a nonexistent next level', () => {
    const decision = buildMasteryProgressionDecision({ mastery: { ...mastery(6), operation: 'geometry_2d_objects' } })
    expect(decision).toMatchObject({
      action: ADAPTATION_ACTIONS.COMPLETE_DOMAIN,
      fromLevel: 6,
      nextLevel: null,
      reasonCodes: ['mastery_achieved', 'domain_ceiling_reached']
    })
  })

  it('records decisions idempotently in bounded adaptive history', () => {
    const profile = { adaptive: {} }
    const decision = buildMasteryProgressionDecision({ mastery: mastery() })

    expect(recordAdaptationDecision(profile, decision)).toBe(true)
    expect(recordAdaptationDecision(profile, decision)).toBe(false)
    expect(profile.adaptive.decisionHistory).toEqual([decision])
    expect(profile.adaptive.lastDecision).toEqual(decision)
  })
})
