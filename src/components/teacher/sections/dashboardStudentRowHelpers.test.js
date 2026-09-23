import { describe, expect, it } from 'vitest'
import { deriveTeacherSummary } from '../../../lib/teacherSummary'
import { buildClassSummaries } from './dashboardAnalyticsHelpers'
import { buildStudentRow } from './dashboardStudentRowHelpers'

function problem(index) {
  return {
    problemId: `problem-${index}`,
    operation: 'addition',
    skill: 'addition',
    level: 1,
    correct: index % 2 === 0,
    correctAnswer: 2,
    studentAnswer: index % 2 === 0 ? 2 : 3,
    errorCategory: index % 2 === 0 ? 'none' : 'knowledge',
    isReasonable: true,
    speedTimeSec: 5,
    timestamp: Date.now() - 60_000
  }
}

describe('teacher dashboard weekly evidence', () => {
  it('does not put a pupil without answers in the support queue', () => {
    const row = buildStudentRow({
      studentId: 'NEW01',
      name: 'New pupil',
      recentProblems: [],
      stats: { lifetimeProblems: 0 }
    })

    expect(row.inactive).toBe(true)
    expect(row.inactivityReason).toBe('Inte kommit igång')
    expect(row.riskLevel).toBe('low')
    expect(row.supportScore).toBe(0)
    expect(row.riskCodes).toEqual([])
  })

  it('uses the complete server summary for weekly totals', () => {
    const problemLog = Array.from({ length: 300 }, (_, index) => problem(index))
    const fullProfile = {
      studentId: 'TEST01',
      name: 'Test',
      classId: 'class-1',
      classIds: ['class-1'],
      problemLog,
      recentProblems: problemLog.slice(-250),
      masteryFacts: { version: 1, facts: [], revokedIds: [] },
      stats: { lifetimeProblems: 300 }
    }
    const bulkProfile = {
      ...fullProfile,
      problemLog: undefined,
      teacherSummary: deriveTeacherSummary(fullProfile)
    }

    const row = buildStudentRow(bulkProfile)
    const classSummary = buildClassSummaries(
      [{ id: 'class-1', name: '6A' }],
      [bulkProfile],
      [],
      280
    )[0]

    expect(row.weekAttempts).toBe(300)
    expect(row.weekCorrectCount).toBe(150)
    expect(row.weekDetailedAttempts).toBe(250)
    expect(row.weekEvidenceStatus).toBe('complete')
    expect(row.todayAttempts).toBe(300)
    expect(row.todayCorrectCount).toBe(150)
    expect(row.todayDetailedAttempts).toBe(250)
    expect(row.todayOperationSummary).toContain('detaljurval 250/300')
    expect(row.supportLabel).toBe('Prioritera')
    expect(row.evidenceLabel).toBe('300 svar denna vecka')
    expect(row.nextAction).toContain('felsvar')
    expect(classSummary.weeklyGoalReachedCount).toBe(1)
  })

  it('falls back visibly to recent data when no summary exists', () => {
    const recentProblems = Array.from({ length: 8 }, (_, index) => problem(index))
    const row = buildStudentRow({
      studentId: 'TEST02',
      name: 'Limited',
      recentProblems,
      stats: { lifetimeProblems: 8 }
    })

    expect(row.weekAttempts).toBe(8)
    expect(row.weekCorrectCount).toBe(4)
    expect(row.weekEvidenceStatus).toBe('limited')
    expect(row.weekEvidenceSource).toBe('recentProblems')
    expect(row.evidenceLabel).toContain('begränsad historik')
  })

  it('separates attained level from current training need and legacy ability', () => {
    const row = buildStudentRow({
      studentId: 'LEVEL01',
      name: 'Levels',
      recentProblems: [],
      stats: { lifetimeProblems: 0 },
      currentDifficulty: 11,
      adaptive: {
        operationAbilities: { addition: 12 },
        currentNeeds: {
          addition: {
            needId: 'need:addition:v1',
            ruleVersion: 1,
            operation: 'addition',
            purpose: 'recover',
            targetLevel: 3,
            reasonCodes: ['consecutive_errors'],
            decidedAt: 1000
          }
        }
      },
      teacherSummary: {
        effectiveLevels: { addition: 5, subtraction: 0 }
      }
    })

    expect(row.attainmentLevels).toEqual({ addition: 5, subtraction: null })
    expect(row.currentNeeds.addition).toMatchObject({ purpose: 'recover', targetLevel: 3 })
    expect(row.operationAbilities.addition).toBe(12)
  })

  it('shows a teacher-only support signal with the actual errors', () => {
    const problemLog = Array.from({ length: 6 }, (_, index) => ({
      ...problem(index),
      observationId: `answer-${index + 1}`,
      problemId: `problem-${index + 1}`,
      promptText: `${index + 4} + 8`,
      correct: false,
      studentAnswer: index + 10,
      correctAnswer: index + 12,
      evidenceSkill: 'addition',
      evidenceLevel: 2,
      evidenceClass: 'mastery_eligible',
      evidenceRuleVersion: 1
    }))
    const fullProfile = {
      studentId: 'SUP01',
      name: 'Support',
      classId: 'class-1',
      classIds: ['class-1'],
      problemLog,
      recentProblems: problemLog,
      adaptive: {
        currentNeeds: {
          addition: {
            needId: 'need:answer-6:v1',
            ruleVersion: 1,
            operation: 'addition',
            purpose: 'support',
            targetLevel: 2,
            reasonCodes: ['recovery_not_yet_sufficient', 'teacher_signal_required'],
            evidenceObservationIds: problemLog.map(item => item.observationId),
            decidedAt: Date.now()
          }
        }
      },
      masteryFacts: { version: 1, facts: [], revokedIds: [] },
      stats: { lifetimeProblems: 6 }
    }
    const bulkProfile = {
      ...fullProfile,
      problemLog: undefined,
      recentProblems: [],
      teacherSummary: deriveTeacherSummary(fullProfile)
    }

    const row = buildStudentRow(bulkProfile)

    expect(row.supportLabel).toBe('Felsignal')
    expect(row.riskLevel).not.toBe('low')
    expect(row.riskCodes[0]).toContain('Addition nivå 2')
    expect(row.supportErrors).toHaveLength(6)
    expect(row.supportErrors[0]).toMatchObject({
      observationId: 'answer-1',
      promptText: '4 + 8',
      studentAnswer: 10,
      correctAnswer: 12
    })
    expect(row.nextAction).toContain('Granska felsvaren')
  })
})
