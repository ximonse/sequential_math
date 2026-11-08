import { getPreferredProblemSource } from './masteryCalculation.js'
import { getSpeedTime } from './mathUtils.js'
import { getStockholmDateKey } from './teacherEvidencePeriods.js'
import { getLogCompleteness, isTableDrill } from './tablePracticeProgress.js'

// Compact table-drill aggregates for long periods (month, terms, total).
// Computed at read time from the stored log; no raw speed times are kept,
// only a sparse 0.1 s histogram that still gives an exact pooled median.

export const LONG_PERIOD_KEYS = ['month', 'term', 'prevTerm', 'total']
const STORED_PERIODS = ['month', 'prevMonth', 'term', 'prevTerm', 'termBefore', 'total']
const MAX_BIN = 300

export function addDays(dateKey, days) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function weekStartOf(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return addDays(dateKey, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7))
}

/** HT = Aug–Dec, VT = Jan–Jun. July belongs to no term (only to total). */
function term(kind, year) {
  return kind === 'HT'
    ? { key: `HT${year}`, label: `HT ${year}`, start: `${year}-08-01`, end: `${year}-12-31` }
    : { key: `VT${year}`, label: `VT ${year}`, start: `${year}-01-01`, end: `${year}-06-30` }
}

export function currentTermOf(dateKey) {
  const [year, month] = dateKey.split('-').map(Number)
  // In July the most recently ended spring term is still "this term".
  return month >= 8 ? term('HT', year) : term('VT', year)
}

export function previousTermOf(value) {
  const year = Number(value.key.slice(2))
  return value.key.startsWith('HT') ? term('VT', year) : term('HT', year - 1)
}

/** Shared period boundaries (Stockholm dates, inclusive) for server and client. */
export function getLongPeriodRanges(now = Date.now(), firstDate = null) {
  const today = getStockholmDateKey(now)
  const current = currentTermOf(today)
  const previous = previousTermOf(current)
  const before = previousTermOf(previous)
  return {
    month: { start: addDays(today, -29), end: today, label: 'Senaste 30 dagarna' },
    prevMonth: { start: addDays(today, -59), end: addDays(today, -30), label: '30 dagarna dessförinnan' },
    term: { start: current.start, end: current.end < today ? current.end : today, label: current.label },
    prevTerm: { start: previous.start, end: previous.end, label: previous.label },
    termBefore: { start: before.start, end: before.end, label: before.label },
    total: { start: firstDate || today, end: today, label: 'Totalt' }
  }
}

function emptyBucket() {
  return { a: 0, c: 0, n: 0, fa: Array(10).fill(0), fc: Array(10).fill(0), h: {} }
}

function bucketFor(container, table) {
  const key = String(table)
  if (!container[key]) container[key] = emptyBucket()
  return container[key]
}

function addToBucket(bucket, problem, table) {
  const correct = problem.correct === true && problem.isPartial !== true
  bucket.a += 1
  if (correct) bucket.c += 1
  const a = Number(problem?.values?.a), b = Number(problem?.values?.b)
  const factor = a === table ? b : b === table ? a : null
  if (Number.isInteger(factor) && factor >= 1 && factor <= 10) {
    bucket.fa[factor - 1] += 1
    if (correct) bucket.fc[factor - 1] += 1
  }
  if (!correct || problem?.interruptionSuspected || problem?.excludedFromSpeed) return null
  const speed = getSpeedTime(problem)
  if (!Number.isFinite(speed) || speed <= 0) return null
  const bin = binOf(speed)
  bucket.h[bin] = (bucket.h[bin] || 0) + 1
  return speed
}

const binOf = speed => String(Math.min(MAX_BIN, Math.max(1, Math.round(speed * 10))))

export function histogramMedian(histogram) {
  const bins = Object.entries(histogram || {}).map(([bin, count]) => [Number(bin), Number(count)])
    .filter(([bin, count]) => bin > 0 && count > 0).sort((x, y) => x[0] - y[0])
  const total = bins.reduce((sum, [, count]) => sum + count, 0)
  if (!total) return null
  const valueAt = index => {
    let seen = 0
    for (const [bin, count] of bins) { seen += count; if (index < seen) return bin / 10 }
    return null
  }
  return total % 2 ? valueAt((total - 1) / 2) : (valueAt(total / 2 - 1) + valueAt(total / 2)) / 2
}

function tableOf(problem) {
  const tagged = String(problem?.skillTag || problem?.metadata?.skillTag || '').match(/^mul_table_(\d{1,2})$/)
  const table = Number(tagged?.[1] || problem?.metadata?.table)
  return Number.isInteger(table) && table >= 2 && table <= 12 ? table : null
}

const inRange = (date, range) => date >= range.start && date <= range.end

export function buildTablePracticeLongHistory(profile, now = Date.now()) {
  const safeNow = Number.isFinite(Number(now)) ? Number(now) : Date.now()
  const source = getPreferredProblemSource(profile)
  const problemLog = Array.isArray(profile?.problemLog) ? profile.problemLog : []
  const recentProblems = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  const sourceName = source === problemLog ? 'problemLog' : source === recentProblems ? 'recentProblems' : 'none'
  const baseComplete = getLogCompleteness(profile, source, sourceName, problemLog, recentProblems).complete

  let oldestStoredDate = null
  const drills = []
  for (const problem of source) {
    const timestamp = Number(problem?.timestamp)
    if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > safeNow) continue
    const date = getStockholmDateKey(timestamp)
    if (!oldestStoredDate || date < oldestStoredDate) oldestStoredDate = date
    if (!isTableDrill(problem) || typeof problem?.correct !== 'boolean') continue
    const table = tableOf(problem)
    if (table) drills.push({ problem, table, date })
  }
  const firstDate = drills.reduce((min, item) => !min || item.date < min ? item.date : min, null)
  const ranges = getLongPeriodRanges(safeNow, firstDate)
  const periods = Object.fromEntries(STORED_PERIODS.map(key => [key, {
    ...ranges[key],
    // A trimmed log is still complete for periods that start after its oldest entry.
    complete: baseComplete || (key !== 'total' && !!oldestStoredDate && ranges[key].start > oldestStoredDate),
    tables: {}
  }]))
  const weeks = {}
  const weekTimes = {}

  for (const { problem, table, date } of drills) {
    let speed = null
    for (const key of STORED_PERIODS) {
      if (inRange(date, periods[key])) speed = addToBucket(bucketFor(periods[key].tables, table), problem, table) ?? speed
    }
    const week = weekStartOf(date)
    weeks[week] ||= {}
    const point = weeks[week][table] ||= { a: 0, c: 0, s: 0, m: null }
    point.a += 1
    if (problem.correct === true && problem.isPartial !== true) point.c += 1
    if (speed !== null) {
      const histogram = weekTimes[`${week}|${table}`] ||= {}
      const bin = binOf(speed)
      histogram[bin] = (histogram[bin] || 0) + 1
    }
  }
  for (const [key, histogram] of Object.entries(weekTimes)) {
    const [week, table] = key.split('|')
    const point = weeks[week][table]
    point.s = Object.values(histogram).reduce((sum, count) => sum + count, 0)
    point.m = histogramMedian(histogram)
  }

  for (const completion of (Array.isArray(profile?.tableDrill?.completions) ? profile.tableDrill.completions : [])) {
    const table = Number(completion?.table), timestamp = Number(completion?.timestamp)
    if (!Number.isInteger(table) || table < 2 || table > 12 || !Number.isFinite(timestamp) || timestamp <= 0 || timestamp > safeNow) continue
    const date = getStockholmDateKey(timestamp)
    for (const key of STORED_PERIODS) if (inRange(date, periods[key])) bucketFor(periods[key].tables, table).n += 1
  }

  return { version: 1, updatedAt: safeNow, endDate: ranges.month.end, historyComplete: baseComplete, oldestStoredDate, periods, weeks }
}
