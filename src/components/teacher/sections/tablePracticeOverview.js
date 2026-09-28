import { buildTablePracticeProgress } from '../../../lib/tablePracticeProgress'
import { tableCompletionStatus } from '../../../lib/tableDrillCompletion'

export const TABLE_NUMBERS = Array.from({ length: 11 }, (_, index) => index + 2)

export function buildTablePracticeOverview(students, days, now = Date.now()) {
  const byTable = TABLE_NUMBERS.map(table => buildTablePracticeProgress(students, { table, days, now }))
  const sourceById = new Map((Array.isArray(students) ? students : []).map(student => [String(student.studentId || ''), student]))
  const rows = byTable[0].students.map(student => ({
    studentId: student.studentId,
    name: student.name,
    tables: Object.fromEntries(byTable.map(progress => [progress.table,
      {
        ...progress.students.find(item => item.studentId === student.studentId),
        completionStatus: tableCompletionStatus(sourceById.get(student.studentId)?.tableDrill, progress.table, now)
      }]))
  }))
  return {
    rows,
    cohorts: Object.fromEntries(byTable.map(progress => [progress.table, {
      ...progress.cohort,
      completedPupils: rows.filter(row => row.tables[progress.table].completionStatus.knownEver).length,
      totalPupils: rows.length
    }])),
    period: { start: byTable[0].currentStart, end: byTable[0].endDate }
  }
}

export function sortTablePracticeOverviewRows(rows, key, direction) {
  return [...rows].sort((a, b) => {
    if (key === 'name') {
      const comparison = a.name.localeCompare(b.name, 'sv')
      return comparison ? (direction === 'asc' ? comparison : -comparison) : a.studentId.localeCompare(b.studentId, 'sv')
    }
    const aTime = a.tables[key]?.available ? a.tables[key]?.current?.medianTimeSec : null
    const bTime = b.tables[key]?.available ? b.tables[key]?.current?.medianTimeSec : null
    const aMissing = !Number.isFinite(aTime)
    const bMissing = !Number.isFinite(bTime)
    if (aMissing !== bMissing) return aMissing ? 1 : -1
    if (!aMissing && aTime !== bTime) return direction === 'asc' ? aTime - bTime : bTime - aTime
    return a.name.localeCompare(b.name, 'sv') || a.studentId.localeCompare(b.studentId, 'sv')
  })
}
