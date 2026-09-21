import { describe, expect, it } from 'vitest'
import { applyWalEntry, validEntry } from './student/[studentId]/events.js'

describe('student event evidence persistence', () => {
  it('accepts a complete observation claim and rejects an unknown evidence class', () => {
    const entry = {
      id: 'event-problem-1',
      type: 'problem_result',
      timestamp: 1200,
      payload: {
        problemId: 'problem-1',
        observationId: 'problem-1:1200',
        timestamp: 1200,
        correct: true,
        evidenceSkill: 'positions_decimal',
        evidenceLevel: 1,
        evidenceClass: 'mastery_eligible',
        evidenceRuleVersion: 1,
        trainingDecisionId: 'start:session-1:positions_decimal:1000:v1:step:1',
        trainingDecisionRuleVersion: 1,
        trainingPurpose: 'introduce',
        trainingReasonCodes: ['first_operation_session', 'introduce_from_foundation'],
        trainingContext: {
          version: 1,
          frameId: 'session-1',
          mode: 'teacher_locked',
          source: 'teacher_assignment',
          assignmentId: 'asg-1',
          assignmentKind: 'standard',
          allowedSkills: ['positions_decimal'],
          levelRange: [1, 1],
          tableSet: [],
          progressionMode: 'steady'
        }
      }
    }

    expect(validEntry(entry, 'ELEV1')).toBe(true)
    const profile = { recentProblems: [], problemLog: [] }
    expect(applyWalEntry(profile, entry)).toBe(true)
    expect(profile.problemLog[0].trainingContext).toEqual(entry.payload.trainingContext)
    expect(profile.problemLog[0]).toMatchObject({
      trainingDecisionRuleVersion: 1,
      trainingPurpose: 'introduce',
      trainingReasonCodes: ['first_operation_session', 'introduce_from_foundation']
    })
    expect(validEntry({
      ...entry,
      payload: { ...entry.payload, evidenceClass: 'surprise' }
    }, 'ELEV1')).toBe(false)
    expect(validEntry({
      ...entry,
      payload: {
        ...entry.payload,
        trainingContext: { ...entry.payload.trainingContext, mode: 'surprise' }
      }
    }, 'ELEV1')).toBe(false)
    expect(validEntry({
      ...entry,
      payload: { ...entry.payload, trainingPurpose: 'guess' }
    }, 'ELEV1')).toBe(false)
    expect(validEntry({
      ...entry,
      payload: { ...entry.payload, trainingReasonCodes: [''] }
    }, 'ELEV1')).toBe(false)
  })

  it('preserves mastery rule version and observation references', () => {
    const profile = {
      masteryFacts: { version: 1, facts: [], revokedIds: [] }
    }
    const entry = {
      id: 'event-1',
      type: 'mastery_achieved',
      timestamp: 1234,
      payload: {
        operation: 'positions_decimal',
        level: 1,
        achievedAt: 1234,
        ruleVersion: 1,
        evidenceObservationIds: ['problem-1:1200'],
        window: { attempts: 5, correct: 5, rate: 1 }
      }
    }

    expect(validEntry(entry, 'ELEV1')).toBe(true)
    expect(applyWalEntry(profile, entry)).toBe(true)
    expect(profile.masteryFacts.facts[0]).toMatchObject({
      operation: 'positions_decimal',
      level: 1,
      achievedAt: 1234,
      ruleVersion: 1,
      evidenceObservationIds: ['problem-1:1200']
    })
  })

  it('lets a referenced mastery event upgrade a same-level legacy fact', () => {
    const profile = {
      masteryFacts: {
        version: 1,
        facts: [{
          id: 'positions_decimal:1:legacy',
          operation: 'positions_decimal',
          level: 1,
          achievedAt: 1000,
          window: { attempts: 5, correct: 5, rate: 1 },
          source: 'session'
        }],
        revokedIds: []
      }
    }
    const entry = {
      id: 'event-upgrade-1',
      type: 'mastery_achieved',
      timestamp: 1234,
      payload: {
        operation: 'positions_decimal',
        level: 1,
        achievedAt: 1234,
        ruleVersion: 1,
        evidenceObservationIds: ['problem-1:1200'],
        window: { attempts: 5, correct: 5, rate: 1 }
      }
    }

    expect(applyWalEntry(profile, entry)).toBe(true)
    expect(profile.masteryFacts.facts).toHaveLength(2)
    expect(profile.masteryFacts.facts[1]).toMatchObject({
      ruleVersion: 1,
      evidenceObservationIds: ['problem-1:1200']
    })
  })

  it('persists one versioned automatic adaptation decision idempotently', () => {
    const profile = { adaptive: {} }
    const entry = {
      id: 'event-decision-1',
      type: 'adaptation_decision',
      timestamp: 1234,
      payload: {
        decisionId: 'mastery:addition:3:1234:v1',
        ruleVersion: 1,
        action: 'advance',
        purpose: 'challenge',
        reasonCodes: ['mastery_achieved', 'next_level_available'],
        operation: 'addition',
        fromLevel: 3,
        nextLevel: 4,
        frameId: 'session-1',
        trainingMode: 'area_focus',
        assignmentId: '',
        evidenceObservationIds: ['problem-1:1200'],
        decidedAt: 1234
      }
    }

    expect(validEntry(entry, 'ELEV1')).toBe(true)
    expect(validEntry({
      ...entry,
      payload: { ...entry.payload, trainingMode: 'surprise' }
    }, 'ELEV1')).toBe(false)
    expect(applyWalEntry(profile, entry)).toBe(true)
    expect(applyWalEntry(profile, entry)).toBe(false)
    expect(profile.adaptive.lastDecision).toEqual(entry.payload)
    expect(profile.adaptive.decisionHistory).toHaveLength(1)
  })

  it('persists the latest current training need idempotently', () => {
    const profile = { adaptive: {} }
    const entry = {
      id: 'event-need-1',
      type: 'current_need_updated',
      timestamp: 1235,
      payload: {
        needId: 'need:answer-1:v1',
        ruleVersion: 1,
        operation: 'addition',
        purpose: 'recover',
        targetLevel: 2,
        reasonCodes: ['consecutive_errors', 'temporary_level_relief'],
        frameId: 'session-1',
        trainingMode: 'area_focus',
        assignmentId: '',
        evidenceObservationIds: ['answer-1'],
        decidedAt: 1235
      }
    }

    expect(validEntry(entry, 'ELEV1')).toBe(true)
    expect(applyWalEntry(profile, entry)).toBe(true)
    expect(applyWalEntry(profile, entry)).toBe(false)
    expect(profile.adaptive.currentNeeds.addition).toEqual(entry.payload)
  })
})
