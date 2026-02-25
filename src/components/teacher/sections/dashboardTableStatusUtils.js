import { getSpeedTime, inferTableFromProblem } from '../../../lib/mathUtils'
import { getStartOfWeekTimestamp } from '../../../lib/studentProfile'

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MASTERY_MIN_ATTEMPTS = 5
const MASTERY_MIN_SUCCESS_RATE = 0.85

function getStartOfDayTimestamp() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

export function buildStickyTableStatusForStudent(student) {
  const startToday = getStartOfDayTimestamp()
  const startWeek = getStartOfWeekTimestamp()
  const source = getTableProblemSourceForStudent(student)
  const todayDoneMap = computeStickyTableCompletionMapForTeacher(source, startToday)
  const weekDoneMap = computeStickyTableCompletionMapForTeacher(source, startWeek)
  const completionCountsToday = getTableCompletionCountsTodayForStudent(student, startToday)

  const statusByTable = {}
  let todayDoneCount = 0
  let weekDoneCount = 0
  let starCount = 0

  for (const table of TABLES) {
    const todayDone = Boolean(todayDoneMap[table])
    const weekDone = Boolean(weekDoneMap[table])
    const star = Number(completionCountsToday[table] || 0) >= 3

    if (star) {
      statusByTable[table] = 'star'
      starCount += 1
    } else if (todayDone) {
      statusByTable[table] = 'today'
    } else if (weekDone) {
      statusByTable[table] = 'week'
    } else {
      statusByTable[table] = 'default'
    }

    if (todayDone) todayDoneCount += 1
    if (weekDone) weekDoneCount += 1
  }

  return {
    statusByTable,
    todayDoneCount,
    weekDoneCount,
    starCount
  }
}

export function getTableProblemSourceForStudent(student) {
  const problemLog = Array.isArray(student?.problemLog) ? student.problemLog : []
  const recentProblems = Array.isArray(student?.recentProblems) ? student.recentProblems : []

  if (problemLog.length === 0) return recentProblems
  if (recentProblems.length === 0) return problemLog

  const logLatest = getLatestProblemTimestamp(problemLog)
  const recentLatest = getLatestProblemTimestamp(recentProblems)
  if (recentLatest > logLatest) return recentProblems
  if (logLatest > recentLatest) return problemLog
  return problemLog.length >= recentProblems.length ? problemLog : recentProblems
}

export function getLatestProblemTimestamp(list) {
  if (!Array.isArray(list) || list.length === 0) return 0
  let maxTs = 0
  for (const item of list) {
    const ts = Number(item?.timestamp || 0)
    if (Number.isFinite(ts) && ts > maxTs) maxTs = ts
  }
  return maxTs
}

export function computeStickyTableCompletionMapForTeacher(problemSource, startTimestamp) {
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
    const table = inferTableFromProblem(problem)
    if (!table) continue

    const entry = progress[table]
    entry.attempts += 1
    if (problem.correct) entry.correct += 1
    if (!entry.reached && isTableCompletedForStickyStatus(entry)) {
      entry.reached = true
    }
  }

  return TABLES.reduce((acc, table) => {
    acc[table] = Boolean(progress[table]?.reached)
    return acc
  }, {})
}

export function getTableCompletionCountsTodayForStudent(student, startTodayTimestamp) {
  const counts = TABLES.reduce((acc, table) => {
    acc[table] = 0
    return acc
  }, {})

  const completions = student?.tableDrill?.completions
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

export function isTableCompletedForStickyStatus(stats) {
  if (!stats) return false
  if (Number(stats.attempts || 0) < 10) return false
  const success = Number(stats.correct || 0) / Math.max(1, Number(stats.attempts || 0))
  return success >= 0.8
}

export function getTeacherTableStatusClass(status) {
  if (status === 'star') return 'bg-green-500 border-green-600 text-white'
  if (status === 'today') return 'bg-green-500 border-green-600 text-white'
  if (status === 'week') return 'bg-green-100 border-green-200 text-green-800'
  return 'bg-gray-100 border-gray-200 text-gray-400'
}

export function getTableSpeedColorClass(medianSpeed, accuracy, attempts) {
  if (!attempts || attempts === 0) return 'bg-gray-100 text-gray-400'
  if (accuracy < 0.5) return 'bg-red-300 text-red-900'
  if (medianSpeed == null) return 'bg-yellow-200 text-yellow-800'
  if (medianSpeed <= 2 && accuracy >= 0.8) return 'bg-emerald-600 text-white'
  if (medianSpeed <= 3.5 && accuracy >= 0.8) return 'bg-emerald-400 text-white'
  if (medianSpeed <= 5 && accuracy >= 0.7) return 'bg-emerald-200 text-emerald-800'
  if (medianSpeed <= 8 && accuracy >= 0.6) return 'bg-yellow-200 text-yellow-800'
  if (accuracy >= 0.5) return 'bg-orange-300 text-orange-900'
  return 'bg-red-300 text-red-900'
}

export function getCompactMasteryColorClass(historical, weekly) {
  const hAttempts = Number(historical?.attempts || 0)
  const hCorrect = Number(historical?.correct || 0)
  const hRate = hAttempts > 0 ? hCorrect / hAttempts : 0
  const wAttempts = Number(weekly?.attempts || 0)
  const wCorrect = Number(weekly?.correct || 0)
  const wRate = wAttempts > 0 ? wCorrect / wAttempts : 0

  if (hAttempts === 0 && wAttempts === 0) return 'bg-gray-100 text-gray-400'
  if (hAttempts >= MASTERY_MIN_ATTEMPTS && hRate >= MASTERY_MIN_SUCCESS_RATE) return 'bg-emerald-600 text-white'
  if (wAttempts > 0 && wRate >= 0.6) return 'bg-emerald-300 text-emerald-900'
  if (hAttempts >= MASTERY_MIN_ATTEMPTS && hRate >= 0.5) return 'bg-orange-200 text-orange-900'
  if (hAttempts >= MASTERY_MIN_ATTEMPTS && hRate < 0.5) return 'bg-red-300 text-red-900'
  return 'bg-blue-200 text-blue-800'
}

export function getTeacherTableStatusLabel(status) {
  if (status === 'star') return 'Star idag'
  if (status === 'today') return 'Klar idag'
  if (status === 'week') return 'Klar denna vecka'
  return 'Ej klar'
}

export function getAccuracy(problems) {
  if (!Array.isArray(problems) || problems.length === 0) return null
  const correct = problems.filter(problem => problem.correct).length
  return correct / problems.length
}

export function getMedianTime(problems) {
  const values = (Array.isArray(problems) ? problems : [])
    .filter(problem => problem.correct)
    .map(problem => getSpeedTime(problem))
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)

  if (values.length === 0) return null
  const middle = Math.floor(values.length / 2)
  if (values.length % 2 === 0) return (values[middle - 1] + values[middle]) / 2
  return values[middle]
}

export function isKnowledgeError(problem) {
  if (!problem || problem.correct) return false
  return String(problem.errorCategory || '') !== 'inattention'
}
