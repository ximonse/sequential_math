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
})
