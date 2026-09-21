import { describe, expect, it } from 'vitest'
import { buildStudentDetailExportRows } from './dashboardStudentDetailExportHelpers'

describe('student detail export meaning', () => {
  it('exports attained level and current need without presenting legacy ability as knowledge', () => {
    const emptyTablePerformance = Object.fromEntries(
      Array.from({ length: 11 }, (_, index) => [index + 2, {
        attemptsTotal: 0,
        correctTotal: 0,
        accuracyTotal: null,
        attempts7d: 0,
        correct7d: 0,
        accuracy7d: null
      }])
    )
    const rows = buildStudentDetailExportRows(
      { studentId: 'ELEV1', name: 'Elev', stats: {}, recentProblems: [] },
      {
        attempts: 0,
        successRate: 0,
        attainmentLevels: { addition: 5 },
        currentNeeds: { addition: { purpose: 'recover', targetLevel: 3 } },
        operationAbilities: { addition: 12 },
        currentDifficulty: 11
      },
      {
        tablePerformanceByTable: emptyTablePerformance,
        tableSticky: { statusByTable: {} },
        operationMasteryBoards: [],
        ncmDetail: null
      }
    )

    expect(rows).toContainEqual(expect.objectContaining({
      Nyckel: 'BelagdNiva:addition',
      Niva: '5',
      Status: 'belagd'
    }))
    expect(rows).toContainEqual(expect.objectContaining({
      Nyckel: 'TranarNu:addition',
      Niva: '3',
      Status: 'recover'
    }))
    expect(rows.some(row => row.Nyckel === 'NivaNu' || row.Nyckel === 'NivaAddition')).toBe(false)
  })
})
