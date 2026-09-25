import { describe, expect, it, vi } from 'vitest'

const downloaded = vi.hoisted(() => [])
vi.mock('./dashboardExportHelpers', () => ({
  buildActivityExportRows: () => [],
  buildSnapshotCsvRows: () => [],
  rowsToCsv: rows => JSON.stringify(rows),
  downloadTextFile: (content, filename) => { downloaded.push({ content, filename }) }
}))
vi.mock('./dashboardStudentDetailExportHelpers', () => ({ buildStudentDetailExportRows: () => [] }))

import { buildDashboardExportActions } from './dashboardExportActions'

// One profile answering the same task on three different days.
function profileWithProblemsOn(dates) {
  return [{
    studentId: 'ABC123',
    name: 'Alva',
    className: '6A',
    problemLog: dates.map((date, index) => ({
      timestamp: Date.parse(`${date}T10:00:00`),
      problemType: 'multiplication_basic',
      promptText: `7 × ${index + 2}`,
      studentAnswer: String(7 * (index + 2)),
      correctAnswer: String(7 * (index + 2)),
      correct: true,
      level: 4,
      timeSpent: 3
    }))
  }]
}

function runExport(exportRange) {
  downloaded.length = 0
  const actions = buildDashboardExportActions({
    visibleRows: [],
    viewMode: 'day',
    weekGoal: 0,
    filteredStudents: profileWithProblemsOn(['2026-09-20', '2026-09-23', '2026-09-25']),
    filteredRows: [],
    detailStudentProfile: null,
    detailStudentRow: null,
    detailStudentViewData: null,
    exportRange,
    setDashboardStatus: () => {}
  })
  actions.handleExportDetailedProblemCsv()
  return downloaded[0]
}

describe('rådataexport med datumintervall', () => {
  it('tar med uppgiften och svaren', () => {
    const file = runExport({ from: '', to: '' })
    expect(file.content).toContain('Uppgift')
    expect(file.content).toContain('7 × 2')
    expect(file.content).toContain('ElevensSvar')
  })

  it('begränsar till valt intervall', () => {
    const file = runExport({ from: '2026-09-23', to: '2026-09-23' })
    expect(file.content).toContain('7 × 3')
    expect(file.content).not.toContain('7 × 2')
    expect(file.content).not.toContain('7 × 4')
  })

  it('tar allt när intervallet är tomt', () => {
    const file = runExport({ from: '', to: '' })
    expect(file.content).toContain('7 × 2')
    expect(file.content).toContain('7 × 4')
  })
})
