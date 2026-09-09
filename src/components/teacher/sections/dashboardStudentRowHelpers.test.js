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
})
