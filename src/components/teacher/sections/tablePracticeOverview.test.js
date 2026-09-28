import { describe, expect, it } from 'vitest'
import { buildTablePracticeHistory } from '../../../lib/tablePracticeProgress'
import { buildTablePracticeOverview, sortTablePracticeOverviewRows } from './tablePracticeOverview'

const now = Date.parse('2026-09-28T12:00:00Z')

function pupil(studentId, answers) {
  const problemLog = answers.map(({ table, correct, speedTimeSec, interruptionSuspected }) => ({
    timestamp: now,
    problemType: 'mul_table_drill',
    skillTag: `mul_table_${table}`,
    values: { a: table, b: 4 },
    correct,
    speedTimeSec,
    interruptionSuspected
  }))
  return {
    studentId, name: studentId,
    teacherSummary: { tablePractice: buildTablePracticeHistory({
      problemLog, recentProblems: problemLog, stats: { lifetimeProblems: problemLog.length }
    }, now) }
  }
}

describe('class table practice overview', () => {
  it('uses the same per-table answers as the detail view and sorts speed in both directions', () => {
    const pupils = [
      pupil('Alma', Array.from({ length: 8 }, () => ({ table: 7, correct: true, speedTimeSec: 6 }))),
      pupil('Bo', [
        ...Array.from({ length: 10 }, (_, index) => ({ table: 7, correct: index < 5, speedTimeSec: 2 })),
        { table: 7, correct: true, speedTimeSec: 600, interruptionSuspected: true },
        ...Array.from({ length: 7 }, () => ({ table: 8, correct: true, speedTimeSec: 4 }))
      ]),
      pupil('Cia', Array.from({ length: 6 }, () => ({ table: 8, correct: true, speedTimeSec: 3 })))
    ]
    const overview = buildTablePracticeOverview(pupils, 14, now)
    expect(overview.rows.find(row => row.name === 'Bo').tables[7].current).toMatchObject({
      attempts: 11, correct: 6, medianTimeSec: 2, speedSamples: 5
    })
    expect(overview.cohorts[7].current).toMatchObject({ attempts: 19, correct: 14, accuracy: 14 / 19 })
    expect(sortTablePracticeOverviewRows(overview.rows, 7, 'asc').map(row => row.name)).toEqual(['Bo', 'Alma', 'Cia'])
    expect(sortTablePracticeOverviewRows(overview.rows, 7, 'desc').map(row => row.name)).toEqual(['Alma', 'Bo', 'Cia'])
    expect(sortTablePracticeOverviewRows(overview.rows, 8, 'asc').map(row => row.name)).toEqual(['Cia', 'Bo', 'Alma'])
  })
})
