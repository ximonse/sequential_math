import { describe, expect, it } from 'vitest'
import { buildAnonymizedClassExport, createImportedTestClass, LOCAL_TEST_DATA_FORMAT } from './localTestDataTransfer.js'

describe('local test data transfer', () => {
  it('exports only selected full histories without identifiers or credentials and derives imported figures from answers', () => {
    const now = Date.UTC(2026, 8, 27, 12)
    const sourceRows = Array.from({ length: 300 }, (_, index) => ({
      timestamp: now - (300 - index) * 60_000,
      correct: index % 4 !== 0,
      problemType: 'mul_table_drill',
      operation: 'multiplication',
      selectionReason: 'table_drill',
      skillTag: 'mul_table_7',
      values: { a: 7, b: index % 10 + 1 },
      studentAnswer: index % 4 !== 0 ? 7 * (index % 10 + 1) : 0,
      correctAnswer: 7 * (index % 10 + 1),
      speedTimeSec: 4,
      timeSpent: 4,
      observationId: `SECRET-OBS-${index}`,
      problemId: `SECRET-PROBLEM-${index}`,
      promptText: 'REAL PUPIL NAME',
      auth: { passwordHash: 'SECRET-HASH' }
    }))
    const profile = {
      studentId: 'REAL-ID', name: 'REAL PUPIL NAME', displayAlias: 'REAL ALIAS',
      auth: { passwordHash: 'SECRET-HASH', passwordSalt: 'SECRET-SALT' },
      classId: 'REAL-CLASS', grade: 6, problemLog: sourceRows,
      recentProblems: sourceRows.slice(-250), stats: { lifetimeProblems: 300 },
      tableDrill: { completions: [{ table: 7, timestamp: now - 60_000 }] }
    }
    const exported = buildAnonymizedClassExport([profile], now)
    expect(exported.format).toBe(LOCAL_TEST_DATA_FORMAT)
    expect(exported.students[0].attempts).toHaveLength(300)
    expect(exported.students[0].name).toBe('Alma Lind')
    expect(exported.students[0].historyComplete).toBe(true)
    const json = JSON.stringify(exported)
    for (const secret of ['REAL-ID', 'REAL PUPIL NAME', 'REAL ALIAS', 'REAL-CLASS', 'SECRET-HASH', 'SECRET-SALT', 'SECRET-OBS', 'SECRET-PROBLEM']) {
      expect(json).not.toContain(secret)
    }
    const { classRecord, profiles } = createImportedTestClass(exported, 'test-1234')
    expect(classRecord.studentIds).toEqual([profiles[0].studentId])
    expect(profiles[0].problemLog).toHaveLength(300)
    expect(profiles[0].recentProblems).toHaveLength(250)
    expect(profiles[0].stats.lifetimeProblems).toBe(300)
    expect(profiles[0].stats.lifetimeCorrectAnswers).toBe(225)
    expect(profiles[0].teacherSummary.tablePractice).toBeTruthy()
  })

  it('marks capped source history incomplete and removes injected fields on import', () => {
    const input = { format: LOCAL_TEST_DATA_FORMAT, students: [{
      name: 'REAL NAME', grade: 6, historyComplete: false,
      attempts: [{ timestamp: Date.now() - 1000, correct: true, problemType: 'mul_table_drill', values: { a: 7, b: 8, pupil: 'REAL NAME', pin: '1234' }, auth: { passwordHash: 'SECRET' }, synthetic: true }],
      completions: []
    }] }
    const { profiles } = createImportedTestClass(input, 'test-5678')
    expect(profiles[0].name).toBe('Alma Lind')
    expect(JSON.stringify(profiles[0].problemLog)).not.toContain('REAL NAME')
    expect(JSON.stringify(profiles[0].problemLog)).not.toContain('SECRET')
    expect(JSON.stringify(profiles[0].problemLog)).not.toContain('1234')
    expect(profiles[0].problemLog[0].synthetic).toBe(true)
    expect(profiles[0].teacherSummary.evidence.historyComplete).toBe(false)
    expect(profiles[0].teacherSummary.tablePractice.historyComplete).toBe(false)
  })
})
