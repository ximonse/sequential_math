import { buildTablePracticeProgress } from './tablePracticeProgress.js'
import { addDays, getLongPeriodRanges, histogramMedian, weekStartOf } from './tablePracticeLongHistory.js'

export const TABLE_PERIODS = [
  { key: '7d', label: 'Senaste 7 dagarna' },
  { key: '14d', label: 'Senaste 14 dagarna' },
  { key: 'month', label: 'Senaste 30 dagarna' },
  { key: 'term', label: 'Denna termin' },
  { key: 'prevTerm', label: 'Förra terminen' },
  { key: 'total', label: 'Totalt' }
]
const PREVIOUS = { month: 'prevMonth', term: 'prevTerm', prevTerm: 'termBefore', total: null }
const MIN_TIMED = 5

export function normalizeTablePeriod(value) {
  if (TABLE_PERIODS.some(item => item.key === value)) return value
  return Number(value) === 14 ? '14d' : '7d'
}

const sum = values => values.reduce((total, value) => total + value, 0)

function summaryFromBuckets(buckets, range, available) {
  const histogram = {}
  const factorCounts = Array(10).fill(0), factorCorrect = Array(10).fill(0)
  let attempts = 0, correct = 0, completions = 0
  for (const bucket of buckets) {
    if (!bucket) continue
    attempts += Number(bucket.a) || 0
    correct += Number(bucket.c) || 0
    completions += Number(bucket.n) || 0
    for (let i = 0; i < 10; i += 1) {
      factorCounts[i] += Number(bucket.fa?.[i]) || 0
      factorCorrect[i] += Number(bucket.fc?.[i]) || 0
    }
    for (const [bin, count] of Object.entries(bucket.h || {})) histogram[bin] = (histogram[bin] || 0) + (Number(count) || 0)
  }
  const speedSamples = sum(Object.values(histogram))
  return {
    startDate: range?.start || '', endDate: range?.end || '', attempts, correct, completions,
    accuracy: attempts ? correct / attempts : null,
    speedHistogram: histogram, correctSpeedTimes: [], speedSamples, medianTimeSec: histogramMedian(histogram),
    factorCounts: Object.fromEntries(factorCounts.map((value, i) => [String(i + 1), value])),
    factorCorrectCounts: Object.fromEntries(factorCorrect.map((value, i) => [String(i + 1), value])),
    factorsCovered: factorCounts.filter(Boolean).length, factorsCorrect: factorCorrect.filter(Boolean).length,
    smallSample: attempts < 6, available
  }
}

function weekKeys(range) {
  const keys = []
  for (let week = weekStartOf(range.start); week <= range.end; week = addDays(week, 7)) keys.push(week)
  return keys
}

function weekPoint(point, date, available) {
  const attempts = Number(point?.a) || 0, correct = Number(point?.c) || 0
  return { date, attempts, correct, accuracy: attempts ? correct / attempts : null, smallSample: attempts < 6,
    speedSamples: Number(point?.s) || 0, medianTimeSec: Number.isFinite(point?.m) ? point.m : null, available }
}

/** Lowest daily or weekly median with enough undisturbed correct answers. */
export function bestMedian(series) {
  const times = (series || []).filter(item => item?.speedSamples >= MIN_TIMED && Number.isFinite(item.medianTimeSec))
    .map(item => item.medianTimeSec)
  return times.length ? Math.min(...times) : null
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function buildLong(students, { table, period, studentId, now }) {
  const ranges = getLongPeriodRanges(now)
  const previousKey = PREVIOUS[period]
  const summaries = (Array.isArray(students) ? students : []).map(student => {
    const long = student?.teacherSummary?.tablePracticeLong
    const available = long?.version === 1 && !!long.periods?.[period]
    const own = available ? long.periods[period] : { ...ranges[period], tables: {} }
    const previous = available && previousKey ? long.periods[previousKey] : null
    const range = { start: own.start, end: own.end }
    const daily = weekKeys(range).map(week => weekPoint(long?.weeks?.[week]?.[table], week, available))
    const current = { ...summaryFromBuckets([own.tables?.[table]], own, available), bestMedianSec: bestMedian(daily) }
    return {
      studentId: String(student.studentId || ''), name: String(student.name || student.displayAlias || student.studentId || ''),
      displayAlias: String(student.displayAlias || student.studentId || ''),
      current, previous: summaryFromBuckets([previous?.tables?.[table]], previous || ranges[previousKey], !!previous),
      daily, available, historyComplete: available && own.complete === true && (!previous || previous.complete === true)
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
  const selectedStudent = summaries.find(item => item.studentId === studentId) || null
  const peers = summaries.filter(item => item !== selectedStudent)
  const included = peers.filter(item => item.available)
  const total = summaries.find(item => item.available)
  const currentRange = total ? { start: total.current.startDate, end: total.current.endDate } : ranges[period]
  const previousRange = previousKey ? ranges[previousKey] : null
  const pooled = key => summaryFromBuckets(included.map(item => ({
    a: item[key].attempts, c: item[key].correct, n: item[key].completions, h: item[key].speedHistogram,
    fa: Object.values(item[key].factorCounts), fc: Object.values(item[key].factorCorrectCounts)
  })), key === 'current' ? currentRange : previousRange, included.length > 0)
  const seriesLength = Math.max(0, ...summaries.map(item => item.daily.length))
  const cohortDaily = Array.from({ length: seriesLength }, (_, index) => {
    const points = included.map(item => item.daily[index]).filter(Boolean)
    const attempts = sum(points.map(item => item.attempts)), correct = sum(points.map(item => item.correct))
    const timed = points.filter(item => item.speedSamples >= MIN_TIMED)
    return { date: points[0]?.date || summaries[0]?.daily[index]?.date || '', attempts, correct,
      accuracy: attempts ? correct / attempts : null, smallSample: attempts < 6, available: included.length > 0,
      // Weekly pupil medians, not pooled answers: weekly points keep no raw times.
      speedSamples: sum(timed.map(item => item.speedSamples)), medianTimeSec: median(timed.map(item => item.medianTimeSec)) }
  })
  const cohort = {
    current: pooled('current'), previous: pooled('previous'),
    includedStudents: peers.length, availableStudents: included.length,
    activeStudents: peers.filter(item => item.current.attempts > 0).length,
    available: included.length > 0, historyComplete: peers.every(item => item.historyComplete), daily: cohortDaily
  }
  return {
    table, period, unit: 'week', days: null,
    currentStart: currentRange.start, endDate: currentRange.end,
    previousStart: previousRange?.start || '', previousEnd: previousRange?.end || '',
    periodLabel: ranges[period].label, previousLabel: previousRange?.label || '', hasPrevious: !!previousKey,
    students: summaries, selectedStudent, cohort,
    daily: cohortDaily.map((day, index) => ({ date: day.date, student: selectedStudent?.daily[index] || null, peers: day }))
  }
}

/** One entry point for all table-practice periods in the teacher view. */
export function buildTablePracticeProgressForPeriod(students, options = {}) {
  const period = normalizeTablePeriod(options.period ?? options.days)
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now()
  const table = Number.isInteger(Number(options.table)) && Number(options.table) >= 2 && Number(options.table) <= 12 ? Number(options.table) : 7
  if (period !== '7d' && period !== '14d') return buildLong(students, { table, period, studentId: options.studentId, now })
  const progress = buildTablePracticeProgress(students, { ...options, table, now, days: period === '14d' ? 14 : 7 })
  const withBest = item => ({ ...item, current: { ...item.current, bestMedianSec: bestMedian(item.daily) } })
  const studentsWithBest = progress.students.map(withBest)
  return {
    ...progress, period, unit: 'day', hasPrevious: true,
    periodLabel: TABLE_PERIODS.find(item => item.key === period).label, previousLabel: 'Föregående lika lång period',
    students: studentsWithBest,
    selectedStudent: progress.selectedStudent ? studentsWithBest.find(item => item.studentId === progress.selectedStudent.studentId) : null
  }
}
