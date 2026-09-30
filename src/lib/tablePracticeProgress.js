import { getPreferredProblemSource } from './masteryCalculation.js'
import { getSpeedTime } from './mathUtils.js'
import { getStockholmDateKey, getStockholmDaysAgoStart } from './teacherEvidencePeriods.js'

export const TABLE_PRACTICE_HISTORY_DAYS = 28
export const TABLE_PRACTICE_MAX_DAYS = 14
const MAX_STORED_PROBLEM_LOG = 5000
const FACTORS = Array.from({ length: 10 }, (_, index) => index + 1)

function emptyBucket() {
  return {
    attempts: 0,
    correct: 0,
    completions: 0,
    correctSpeedTimes: [],
    factors: Object.fromEntries(FACTORS.map(factor => [String(factor), { attempts: 0, correct: 0 }]))
  }
}

function isTableDrill(problem) {
  const template = String(problem?.template || '').trim()
  const problemType = String(problem?.problemType || '').trim()
  const selectionReason = String(problem?.selectionReason || problem?.metadata?.selectionReason || '').trim()
  const skillTag = String(problem?.skillTag || '').trim()
  const trainingMode = String(problem?.trainingMode || problem?.trainingContext?.mode || '').trim()

  return template === 'mul_table_drill'
    || problemType === 'mul_table_drill'
    || selectionReason === 'table_drill'
    || selectionReason === 'table_drill_queue'
    || /^mul_table_\d{1,2}$/.test(skillTag)
    || trainingMode === 'table_drill'
}

function timestampOf(problem) {
  const timestamp = Number(problem?.timestamp)
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null
}

function addAttempt(bucket, problem, table) {
  const isCorrect = problem.correct === true && problem.isPartial !== true
  bucket.attempts += 1
  if (isCorrect) bucket.correct += 1

  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  const otherFactor = a === table ? b : b === table ? a : null
  if (Number.isInteger(otherFactor) && otherFactor >= 1 && otherFactor <= 10) {
    const factor = bucket.factors[String(otherFactor)]
    factor.attempts += 1
    if (isCorrect) factor.correct += 1
  }

  if (!isCorrect || problem?.interruptionSuspected || problem?.excludedFromSpeed) return
  const speedTime = getSpeedTime(problem)
  if (Number.isFinite(speedTime) && speedTime > 0) bucket.correctSpeedTimes.push(speedTime)
}

function median(values) {
  const sorted = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function makeDateWindow(now, days = TABLE_PRACTICE_HISTORY_DAYS) {
  return Array.from({ length: days }, (_, index) =>
    getStockholmDateKey(getStockholmDaysAgoStart(now, days - 1 - index))
  )
}

function makeDay(date) {
  return { date, tables: {} }
}

function ensureBucket(day, table) {
  const key = String(table)
  if (!day.tables[key]) day.tables[key] = emptyBucket()
  return day.tables[key]
}

function addExclusion(exclusions, key) {
  exclusions[key] = Number(exclusions[key] || 0) + 1
}

function addTableCompletions(profile, dayMap, exclusions, completeness) {
  const completions = Array.isArray(profile?.tableDrill?.completions) ? profile.tableDrill.completions : []
  for (const completion of completions) {
    const table = Number(completion?.table)
    const timestamp = Number(completion?.timestamp)
    if (!Number.isInteger(table) || table < 2 || table > 12 || !Number.isFinite(timestamp) || timestamp <= 0) {
      addExclusion(exclusions, 'invalidCompletion')
      completeness.complete = false
      continue
    }
    if (timestamp > completeness.now) {
      addExclusion(exclusions, 'futureCompletion')
      completeness.complete = false
      continue
    }
    const day = dayMap.get(getStockholmDateKey(timestamp))
    if (!day) {
      addExclusion(exclusions, 'completionOutOfWindow')
      continue
    }
    ensureBucket(day, table).completions += 1
  }
}

function getLogCompleteness(profile, source, sourceName, problemLog, recentProblems) {
  const lifetime = Number(profile?.stats?.lifetimeProblems ?? profile?.stats?.totalProblems)
  const hasLifetime = Number.isFinite(lifetime) && lifetime >= 0
  const logAtCap = problemLog.length >= MAX_STORED_PROBLEM_LOG
  const lifetimeExceedsStored = hasLifetime && lifetime > source.length
  const missingFullLog = !Array.isArray(profile?.problemLog)
    || (sourceName !== 'problemLog' && source.length > 0)
    || (problemLog.length === 0 && recentProblems.length > 0)
    || (!hasLifetime && source.length > 0)

  return {
    logAtCap,
    lifetimeExceedsStored,
    missingFullLog,
    complete: profile?.importHistoryComplete !== false && !logAtCap && !lifetimeExceedsStored && !missingFullLog
  }
}

/**
 * Build an immutable, 28-Stockholm-day table-drill history from the best full
 * profile source available. Ordinary multiplication is intentionally ignored.
 */
export function buildTablePracticeHistory(profile, now = Date.now()) {
  const safeNow = Number.isFinite(Number(now)) ? Number(now) : Date.now()
  const problemLog = Array.isArray(profile?.problemLog) ? profile.problemLog : []
  const recentProblems = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  const source = getPreferredProblemSource(profile)
  const sourceName = source === problemLog ? 'problemLog' : source === recentProblems ? 'recentProblems' : 'none'
  const dateKeys = makeDateWindow(safeNow)
  const dayMap = new Map(dateKeys.map(date => [date, makeDay(date)]))
  const exclusions = {
    missingFullLog: 0,
    logAtCap: 0,
    lifetimeExceedsStored: 0,
    invalidTimestamp: 0,
    futureTimestamp: 0,
    outOfWindow: 0,
    nonTableDrill: 0,
    invalidTable: 0,
    invalidResult: 0,
    invalidCompletion: 0,
    futureCompletion: 0,
    completionOutOfWindow: 0
  }
  const completeness = { ...getLogCompleteness(profile, source, sourceName, problemLog, recentProblems), now: safeNow }

  if (completeness.missingFullLog) exclusions.missingFullLog = 1
  if (completeness.logAtCap) exclusions.logAtCap = 1
  if (completeness.lifetimeExceedsStored) exclusions.lifetimeExceedsStored = 1

  for (const problem of source) {
    if (!isTableDrill(problem)) {
      addExclusion(exclusions, 'nonTableDrill')
      continue
    }

    const timestamp = timestampOf(problem)
    if (timestamp === null) {
      addExclusion(exclusions, 'invalidTimestamp')
      completeness.complete = false
      continue
    }
    if (timestamp > safeNow) {
      addExclusion(exclusions, 'futureTimestamp')
      completeness.complete = false
      continue
    }

    const taggedTable = String(problem?.skillTag || problem?.metadata?.skillTag || '').match(/^mul_table_(\d{1,2})$/)
    const table = Number(taggedTable?.[1] || problem?.metadata?.table)
    if (!Number.isInteger(table) || table < 2 || table > 12) {
      addExclusion(exclusions, 'invalidTable')
      completeness.complete = false
      continue
    }
    if (typeof problem?.correct !== 'boolean') {
      addExclusion(exclusions, 'invalidResult')
      completeness.complete = false
      continue
    }

    const date = getStockholmDateKey(timestamp)
    const day = dayMap.get(date)
    if (!day) {
      addExclusion(exclusions, 'outOfWindow')
      continue
    }
    addAttempt(ensureBucket(day, table), problem, table)
  }

  addTableCompletions(profile, dayMap, exclusions, completeness)

  return {
    version: 1,
    updatedAt: safeNow,
    windowDays: TABLE_PRACTICE_HISTORY_DAYS,
    windowStart: dateKeys[0],
    endDate: dateKeys[dateKeys.length - 1],
    historyComplete: completeness.complete,
    source: sourceName,
    exclusions,
    days: dateKeys.map(date => dayMap.get(date))
  }
}

function emptySummary(startDate, endDate, available = true) {
  return {
    startDate,
    endDate,
    attempts: 0,
    correct: 0,
    completions: 0,
    accuracy: null,
    speedSamples: 0, correctSpeedTimes: [],
    medianTimeSec: null,
    factorsCovered: 0,
    factorCounts: Object.fromEntries(FACTORS.map(factor => [String(factor), 0])),
    factorsCorrect: 0,
    factorCorrectCounts: Object.fromEntries(FACTORS.map(factor => [String(factor), 0])),
    smallSample: true,
    available
  }
}

function summarizeDays(days, table, startIndex, count, availableDates) {
  const dateRows = days.slice(startIndex, startIndex + count)
  const summary = emptySummary(dateRows[0]?.date || '', dateRows[dateRows.length - 1]?.date || '')
  const speedTimes = []
  let completeDays = 0

  for (const day of dateRows) {
    if (!availableDates.has(day.date)) continue
    completeDays += 1
    const bucket = day.tables?.[String(table)]
    if (!bucket) continue
    summary.attempts += Number(bucket.attempts) || 0
    summary.correct += Number(bucket.correct) || 0
    summary.completions += Number(bucket.completions) || 0
    speedTimes.push(...(Array.isArray(bucket.correctSpeedTimes) ? bucket.correctSpeedTimes : []))
    for (const factor of FACTORS) {
      summary.factorCounts[String(factor)] += Number(bucket.factors?.[String(factor)]?.attempts) || 0
      summary.factorCorrectCounts[String(factor)] += Number(bucket.factors?.[String(factor)]?.correct) || 0
    }
  }

  summary.accuracy = summary.attempts > 0 ? summary.correct / summary.attempts : null
  summary.correctSpeedTimes = speedTimes
  summary.speedSamples = speedTimes.length
  summary.medianTimeSec = median(speedTimes)
  summary.factorsCovered = Object.values(summary.factorCounts).filter(attempts => attempts > 0).length
  summary.factorsCorrect = Object.values(summary.factorCorrectCounts).filter(correct => correct > 0).length
  summary.smallSample = summary.attempts < 6
  summary.available = completeDays === count
  return summary
}

function getHistoryStatus(student, expectedDates) {
  const history = student?.teacherSummary?.tablePractice
  if (!history || typeof history !== 'object' || history.version !== 1 || !Array.isArray(history.days)) {
    return { history: null, available: false, historyComplete: false, availableDates: new Set() }
  }

  const rowsByDate = new Map(history.days
    .filter(day => typeof day?.date === 'string')
    .map(day => [day.date, day]))
  const availableDates = new Set(expectedDates.filter(date => rowsByDate.has(date)))
  const today = expectedDates[expectedDates.length - 1]
  const updatedAt = Number(history.updatedAt)
  const freshToday = Number.isFinite(updatedAt)
    && updatedAt > 0
    && getStockholmDateKey(updatedAt) === today
  const completeWindow = expectedDates.every(date => rowsByDate.has(date))

  return {
    history: { ...history, days: expectedDates.map(date => rowsByDate.get(date) || makeDay(date)) },
    available: true,
    historyComplete: history.historyComplete === true && completeWindow && freshToday,
    availableDates
  }
}

function aggregate(items, period) {
  const availableItems = items.filter(item => item.available)
  const summaries = availableItems.map(item => item[period])
  const result = emptySummary(summaries[0]?.startDate || '', summaries[0]?.endDate || '', availableItems.length > 0)
  result.correctSpeedTimes = summaries.flatMap(item => item.correctSpeedTimes)
  for (const summary of summaries) {
    result.attempts += summary.attempts
    result.correct += summary.correct
    result.completions += summary.completions
    for (const factor of FACTORS) {
      result.factorCounts[factor] += summary.factorCounts[factor]
      result.factorCorrectCounts[factor] += summary.factorCorrectCounts[factor]
    }
  }
  result.accuracy = result.attempts ? result.correct / result.attempts : null
  result.speedSamples = result.correctSpeedTimes.length
  result.medianTimeSec = median(result.correctSpeedTimes)
  result.factorsCovered = Object.values(result.factorCounts).filter(count => count > 0).length
  result.factorsCorrect = Object.values(result.factorCorrectCounts).filter(count => count > 0).length
  result.smallSample = result.attempts < 6
  return result
}

/** One table, one period, one meaning in the class, pupil, chart and export. */
export function buildTablePracticeProgress(students, options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now()
  const table = Number.isInteger(Number(options.table)) && Number(options.table) >= 2 && Number(options.table) <= 12 ? Number(options.table) : 7
  const days = Number(options.days) === 14 ? 14 : 7
  const dates = makeDateWindow(now)
  const currentStart = dates[28 - days]
  const previousStart = dates[28 - 2 * days]
  const previousEnd = dates[27 - days]
  const endDate = dates[27]
  const summaries = (Array.isArray(students) ? students : []).map(student => {
    const status = getHistoryStatus(student, dates)
    const summarize = (start, count) => summarizeDays(
      status.history?.days || dates.map(makeDay), table, start, count, status.availableDates
    )
    return {
      studentId: String(student.studentId || ''), name: String(student.name || student.displayAlias || student.studentId || ''),
      displayAlias: String(student.displayAlias || student.studentId || ''),
      current: summarize(28 - days, days), previous: summarize(28 - 2 * days, days),
      daily: dates.slice(28 - days).map((date, index) => ({ date, ...summarize(28 - days + index, 1) })),
      available: status.available, historyComplete: status.historyComplete
    }
  }).sort((a, b) => a.name.localeCompare(b.name, 'sv'))
  const selectedStudent = summaries.find(item => item.studentId === options.studentId) || null
  const peers = summaries.filter(item => item !== selectedStudent)
  const current = aggregate(peers, 'current')
  const previous = aggregate(peers, 'previous')
  const cohort = {
    current, previous,
    includedStudents: peers.length,
    availableStudents: peers.filter(item => item.available).length,
    activeStudents: peers.filter(item => item.current.attempts > 0).length,
    available: peers.some(item => item.available),
    historyComplete: peers.every(item => item.historyComplete),
    daily: dates.slice(28 - days).map((date, index) => ({ date,
      ...aggregate(peers.map(item => ({ ...item, day: item.daily[index] })), 'day')
    }))
  }
  return {
    table, days, currentStart, previousStart, previousEnd, endDate,
    periods: { currentStart, previousStart, previousEnd, endDate },
    students: summaries, selectedStudent, cohort,
    daily: cohort.daily.map((day, index) => ({ date: day.date, student: selectedStudent?.daily[index] || null, peers: day }))
  }
}
