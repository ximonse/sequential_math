import { getStartOfWeekTimestamp } from '../../lib/studentProfile'
import { normalizeProgressionMode, PROGRESSION_MODE_CHALLENGE } from '../../lib/progressionModes'

export const MASTERY_MIN_ATTEMPTS = 5
export const MASTERY_MIN_SUCCESS_RATE = 0.85
export const LEVELS = Array.from({ length: 12 }, (_, index) => index + 1)
export const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function createOperationLevelBuckets() {
  const makeLevelMap = () => Object.fromEntries(
    LEVELS.map(level => [level, { attempts: 0, correct: 0 }])
  )

  return {
    historical: makeLevelMap(),
    weekly: makeLevelMap()
  }
}

export function buildLevelMasteryView(level, bucket = {}) {
  const attempts = Number(bucket.attempts || 0)
  const correct = Number(bucket.correct || 0)
  const successRate = attempts > 0 ? correct / attempts : 0
  const isMastered = attempts >= MASTERY_MIN_ATTEMPTS && successRate >= MASTERY_MIN_SUCCESS_RATE
  const isStarted = attempts > 0

  const status = isMastered ? 'mastered' : (isStarted ? 'started' : 'empty')
  const successPercent = Math.round(successRate * 100)
  const metricsLabel = isStarted ? `${correct}/${attempts}` : '-'
  const title = isStarted
    ? `Nivå ${level}: ${correct}/${attempts} rätt (${successPercent}%)`
    : `Nivå ${level}: ingen träning ännu`

  return {
    level,
    attempts,
    correct,
    successRate,
    successPercent,
    status,
    metricsLabel,
    title
  }
}

export function getMasteryLevelClassName(status) {
  if (status === 'mastered') {
    return 'bg-green-100 text-green-800 border-green-300'
  }
  if (status === 'started') {
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }
  return 'bg-gray-50 text-gray-400 border-gray-200 opacity-45'
}

export function buildTableStatus(profile) {
  const fallback = Object.fromEntries(TABLES.map(table => [table, 'default']))
  if (!profile) return fallback

  const startToday = getStartOfDayTimestamp()
  const startWeek = getStartOfWeekTimestamp()
  const completionCountsToday = getTableCompletionCountsToday(profile, startToday)
  const problemSource = getTableProblemSource(profile)
  const todayDoneMap = computeStickyTableCompletionMap(problemSource, startToday)
  const weekDoneMap = computeStickyTableCompletionMap(problemSource, startWeek)

  const result = {}
  for (const table of TABLES) {
    const weekDone = Boolean(weekDoneMap[table])
    const todayDone = Boolean(todayDoneMap[table])
    const star = (completionCountsToday[table] || 0) >= 3

    if (star) {
      result[table] = 'star'
    } else if (todayDone) {
      result[table] = 'today'
    } else if (weekDone) {
      result[table] = 'week'
    } else {
      result[table] = 'default'
    }
  }

  return result
}

export function getTableStatusClass(status) {
  if (status === 'star') return 'bg-green-500 text-white'
  if (status === 'today') return 'bg-green-500 text-white'
  if (status === 'week') return 'bg-green-100 text-green-800'
  return 'bg-gray-100 text-gray-700'
}

export function buildPracticePath(studentId, options = {}) {
  const params = new URLSearchParams()
  if (options.mode) params.set('mode', options.mode)
  const progressionMode = normalizeProgressionMode(options.progressionMode, PROGRESSION_MODE_CHALLENGE)
  params.set('pace', progressionMode)
  const level = Number(options.level)
  if (Number.isInteger(level) && level >= 1 && level <= 12) {
    params.set('level', String(level))
  }
  const query = params.toString()
  return query
    ? `/student/${studentId}/practice?${query}`
    : `/student/${studentId}/practice`
}

function getTableProblemSource(profile) {
  const problemLog = Array.isArray(profile?.problemLog) ? profile.problemLog : []
  const recentProblems = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []

  if (problemLog.length === 0) return recentProblems
  if (recentProblems.length === 0) return problemLog

  const logLatest = getLatestProblemTimestamp(problemLog)
  const recentLatest = getLatestProblemTimestamp(recentProblems)
  if (recentLatest > logLatest) return recentProblems
  if (logLatest > recentLatest) return problemLog
  return problemLog.length >= recentProblems.length ? problemLog : recentProblems
}

function getLatestProblemTimestamp(list) {
  if (!Array.isArray(list) || list.length === 0) return 0
  let maxTs = 0
  for (const item of list) {
    const ts = Number(item?.timestamp || 0)
    if (Number.isFinite(ts) && ts > maxTs) maxTs = ts
  }
  return maxTs
}

function computeStickyTableCompletionMap(problemSource, startTimestamp) {
  const progress = TABLES.reduce((acc, table) => {
    acc[table] = {
      attempts: 0,
      correct: 0,
      reached: false
    }
    return acc
  }, {})

  if (!Array.isArray(problemSource) || problemSource.length === 0) {
    return TABLES.reduce((acc, table) => {
      acc[table] = false
      return acc
    }, {})
  }

  const scoped = problemSource
    .filter(item => Number(item?.timestamp || 0) >= startTimestamp)
    .slice()
    .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0))

  for (const problem of scoped) {
    const table = inferMultiplicationTable(problem)
    if (!table) continue

    const entry = progress[table]
    entry.attempts += 1
    if (problem.correct) entry.correct += 1
    if (!entry.reached && isTableCompleted(entry)) {
      entry.reached = true
    }
  }

  return TABLES.reduce((acc, table) => {
    acc[table] = Boolean(progress[table]?.reached)
    return acc
  }, {})
}

function getTableCompletionCountsToday(profile, startTodayTimestamp) {
  const counts = TABLES.reduce((acc, table) => {
    acc[table] = 0
    return acc
  }, {})

  const completions = profile?.tableDrill?.completions
  if (!Array.isArray(completions)) return counts

  for (const completion of completions) {
    const table = Number(completion?.table)
    const ts = Number(completion?.timestamp || 0)
    if (!TABLES.includes(table)) continue
    if (ts < startTodayTimestamp) continue
    counts[table] += 1
  }

  return counts
}

function inferMultiplicationTable(problem) {
  const tag = String(problem?.skillTag || '')
  const match = tag.match(/^mul_table_(\d{1,2})$/)
  if (match) {
    const n = Number(match[1])
    if (n >= 2 && n <= 12) return n
  }

  if (!String(problem?.problemType || '').startsWith('mul_')) return null
  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null

  if (a >= 2 && a <= 12 && b >= 1 && b <= 12) return a
  if (b >= 2 && b <= 12 && a >= 1 && a <= 12) return b
  return null
}

function isTableCompleted(stats) {
  if (!stats) return false
  if (stats.attempts < 10) return false
  const success = stats.correct / Math.max(1, stats.attempts)
  return success >= 0.8
}

function getStartOfDayTimestamp() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}
