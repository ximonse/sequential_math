import { describe, expect, it } from 'vitest'
import { applyWalEntry } from '../../api/student/[studentId]/events.js'
import { addProblemResult, createStudentProfile } from './studentProfile'
import { mergeCloudSyncProblemEntries } from './storageCloudSync'
import { deriveTeacherSummary } from './teacherSummary'
import { buildTrainingContext } from './trainingContext'

describe('evidence chain replay', () => {
  it('keeps one answer semantically identical through event and full-profile paths', () => {
    const sourceProfile = createStudentProfile('ELEV1', 'Ada', 5)
    const problem = {
      id: 'division-1',
      domain: 'arithmetic',
      skill: 'division',
      type: 'division',
      level: 3,
      values: { a: 24, b: 6 },
      result: 4,
      difficulty: { conceptual_level: 3 }
    }
    const trainingContext = buildTrainingContext({
      sessionId: 'session-replay',
      assignment: {
        id: 'asg-division',
        kind: 'standard',
        problemTypes: ['division'],
        minLevel: 3,
        maxLevel: 3
      },
      progressionMode: 'steady'
    })
    const { result } = addProblemResult(sourceProfile, problem, 4, 5, {
      rawAnswer: '4',
      trainingContext
    })

    const eventProfile = { recentProblems: [], problemLog: [], stats: { lifetimeProblems: 1 } }
    expect(applyWalEntry(eventProfile, {
      id: 'event-replay',
      type: 'problem_result',
      timestamp: result.timestamp,
      payload: structuredClone(result)
    })).toBe(true)

    const profileMergeProfile = {
      recentProblems: mergeCloudSyncProblemEntries([], [structuredClone(result)], 250),
      problemLog: mergeCloudSyncProblemEntries([], [structuredClone(result)], 5000),
      stats: { lifetimeProblems: 1 }
    }

    for (const replayedProfile of [eventProfile, profileMergeProfile]) {
      expect(replayedProfile.problemLog[0]).toMatchObject({
        observationId: result.observationId,
        evidenceSkill: 'division',
        evidenceLevel: 3,
        evidenceClass: 'mastery_eligible',
        trainingMode: 'teacher_locked',
        trainingContext
      })
      const summary = deriveTeacherSummary(replayedProfile)
      expect(summary.weeklyActivity.attempts).toBe(1)
      expect(summary.operationStats7d.division).toMatchObject({ attempts: 1, correct: 1 })
      expect(summary.evidence.classification).toMatchObject({
        total: 1,
        contract: 1,
        legacyClassified: 0,
        unknown: 0
      })
    }
  })
})
