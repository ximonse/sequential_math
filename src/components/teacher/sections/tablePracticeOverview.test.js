import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildTablePracticeHistory } from '../../../lib/tablePracticeProgress'
import { buildTablePracticeOverview, sortTablePracticeOverviewRows } from './tablePracticeOverview'
import TablePracticeOverviewPanel from './TablePracticeOverviewPanel'

const now = Date.parse('2026-09-28T12:00:00Z')

function pupil(studentId, answers, tableDrill) {
  const problemLog = answers.map(({ table, factor = 4, correct, speedTimeSec, interruptionSuspected }) => ({
    timestamp: now,
    problemType: 'mul_table_drill',
    skillTag: `mul_table_${table}`,
    values: { a: table, b: factor },
    correct,
    speedTimeSec,
    interruptionSuspected
  }))
  return {
    studentId, name: studentId, tableDrill,
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

  it('keeps repeated correct answers grey until a full round is evidenced and counts distinct correct facts', () => {
    const repeated = pupil('Repeated', Array.from({ length: 12 }, (_, index) => ({ table: 4, factor: index % 3 + 1, correct: true, speedTimeSec: 2 })))
    const full = pupil('Full', Array.from({ length: 10 }, (_, index) => ({ table: 4, factor: index + 1, correct: true, speedTimeSec: 4 })), {
      completions: [{ table: 4, timestamp: now }]
    })
    const overview = buildTablePracticeOverview([repeated, full], 14, now)
    expect(overview.rows.find(row => row.name === 'Repeated').tables[4]).toMatchObject({
      completionStatus: { knownEver: false, todayCompleted: false }, current: { factorsCorrect: 3, accuracy: 1 }
    })
    expect(overview.rows.find(row => row.name === 'Full').tables[4]).toMatchObject({
      completionStatus: { knownEver: true, todayCompleted: true }, current: { factorsCorrect: 10 }
    })
    expect(overview.cohorts[4]).toMatchObject({ completedPupils: 1, totalPupils: 2 })
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now)
    try {
      const html = renderToStaticMarkup(createElement(TablePracticeOverviewPanel, { students: [repeated, full], days: 14 }))
      expect(html).toContain('3/10')
      expect(html).toContain('Ingen hel tabell belagd i sparad historik')
      expect(html).toContain('Hel tabell klarad idag')
      expect(html).toContain('Rött tidsstreck')
    } finally {
      clock.mockRestore()
    }
  })
})
