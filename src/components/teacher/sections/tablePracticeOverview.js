import { buildTablePracticeProgress } from '../../../lib/tablePracticeProgress'
import { tableCompletionStatus } from '../../../lib/tableDrillCompletion'

export const TABLE_NUMBERS = Array.from({ length: 11 }, (_, index) => index + 2)

export function buildTablePracticeOverview(students, days, now = Date.now()) {
  const byTable = TABLE_NUMBERS.map(table => buildTablePracticeProgress(students, { table, days, now }))
  const sourceById = new Map((Array.isArray(students) ? students : []).map(student => [String(student.studentId || ''), student]))
  const rows = byTable[0].students.map(student => {
    const row = {
      studentId: student.studentId,
      name: student.name,
      tables: Object.fromEntries(byTable.map(progress => [progress.table,
        {
          ...progress.students.find(item => item.studentId === student.studentId),
          completionStatus: tableCompletionStatus(sourceById.get(student.studentId)?.tableDrill, progress.table, now)
        }]))
    }
    return { ...row, ranking: tableOverviewRanking(row) }
  })
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

export const OVERVIEW_STUDENT_SORTS = [
  { key: 'name', label: 'namn', direction: 'asc' },
  { key: 'tested', label: 'testade', direction: 'desc' },
  { key: 'performance', label: 'resultat', direction: 'desc' }
]

export function nextOverviewStudentSort(key) {
  const index = OVERVIEW_STUDENT_SORTS.findIndex(item => item.key === key)
  return OVERVIEW_STUDENT_SORTS[(index + 1) % OVERVIEW_STUDENT_SORTS.length]
}

export function tableOverviewRanking(row) {
  const items = TABLE_NUMBERS.map(table => row.tables[table]).filter(item => item?.available)
  if (!items.length) return { tested: null, complete: null, strong: null, meanTime: null, accuracy: null }
  const tested = items.filter(item => item.current.attempts > 0)
  const complete = tested.filter(item => item.current.factorsCorrect === 10)
  const timed = complete.filter(item => item.current.speedSamples >= 5 && Number.isFinite(item.current.medianTimeSec))
  const attempts = complete.reduce((sum, item) => sum + item.current.attempts, 0)
  return {
    tested: tested.length,
    complete: complete.length,
    strong: timed.filter(item => item.current.medianTimeSec < 3).length,
    meanTime: timed.length ? timed.reduce((sum, item) => sum + item.current.medianTimeSec, 0) / timed.length : null,
    accuracy: attempts ? complete.reduce((sum, item) => sum + item.current.correct, 0) / attempts : null
  }
}

const compareMetric = (a, b, direction) => {
  const aMissing = !Number.isFinite(a), bMissing = !Number.isFinite(b)
  if (aMissing !== bMissing) return aMissing ? 1 : -1
  return aMissing ? 0 : (a - b) * (direction === 'asc' ? 1 : -1)
}

export function sortTablePracticeOverviewRows(rows, key, direction) {
  return [...rows].sort((a, b) => {
    let comparison = 0
    if (key === 'name') comparison = a.name.localeCompare(b.name, 'sv') * (direction === 'asc' ? 1 : -1)
    else if (key === 'tested' || key === 'performance') {
      const aRank = a.ranking || tableOverviewRanking(a), bRank = b.ranking || tableOverviewRanking(b)
      if (key === 'tested') comparison = compareMetric(aRank.tested, bRank.tested, direction)
      else comparison = compareMetric(aRank.strong, bRank.strong, 'desc')
        || compareMetric(aRank.complete, bRank.complete, 'desc')
        || compareMetric(aRank.meanTime, bRank.meanTime, 'asc')
        || compareMetric(aRank.accuracy, bRank.accuracy, 'desc')
        || compareMetric(aRank.tested, bRank.tested, 'desc')
    } else {
      const aTime = a.tables[key]?.available ? a.tables[key]?.current?.medianTimeSec : null
      const bTime = b.tables[key]?.available ? b.tables[key]?.current?.medianTimeSec : null
      comparison = compareMetric(aTime, bTime, direction)
    }
    return comparison || a.name.localeCompare(b.name, 'sv') || a.studentId.localeCompare(b.studentId, 'sv')
  })
}
