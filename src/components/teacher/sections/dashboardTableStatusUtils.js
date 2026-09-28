import { getSpeedTime, inferTableFromProblem } from '../../../lib/mathUtils'
import { getPreferredProblemSource } from '../../../lib/masteryCalculation'
import { getStartOfWeekTimestamp } from '../../../lib/studentProfile'
import { TABLES, MASTERY_MIN_ATTEMPTS, MASTERY_MIN_SUCCESS_RATE } from './dashboardConstants'

function getStartOfDayTimestamp() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

export function buildStickyTableStatusForStudent(student) {
  const startToday = getStartOfDayTimestamp()
  const startWeek = getStartOfWeekTimestamp()
  const source = getPreferredProblemSource(student)
  const todayProgress = computeStickyTableProgressForTeacher(source, startToday)
  const weekProgress = computeStickyTableProgressForTeacher(source, startWeek)
  const completionCountsToday = getTableCompletionCountsTodayForStudent(student, startToday)

  const statusByTable = {}
  const progressByTable = {}
  let todayDoneCount = 0
  let weekDoneCount = 0
  let starCount = 0

  for (const table of TABLES) {
    const today = todayProgress[table]
    const week = weekProgress[table]
    const todayDone = Boolean(today?.reached)
    const weekDone = Boolean(week?.reached)
    const star = Number(completionCountsToday[table] || 0) >= 3

    progressByTable[table] = {
      todayAttempts: today?.attempts || 0,
      todayCorrect: today?.correct || 0,
      weekAttempts: week?.attempts || 0,
      weekCorrect: week?.correct || 0
    }

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
    progressByTable,
    todayDoneCount,
    weekDoneCount,
    starCount
  }
}


export function computeStickyTableProgressForTeacher(problemSource, startTimestamp) {
  const progress = TABLES.reduce((acc, table) => {
    acc[table] = {
      attempts: 0,
      correct: 0,
      reached: false
    }
    return acc
  }, {})

  if (!Array.isArray(problemSource) || problemSource.length === 0) return progress

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

  return progress
}

export function computeStickyTableCompletionMapForTeacher(problemSource, startTimestamp) {
  const progress = computeStickyTableProgressForTeacher(problemSource, startTimestamp)

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

export function getCompactMasteryStatus(historical, weekly, monthly) {
  const attempts = Number(historical?.attempts || 0)
  const windowAttempts = Number(historical?.masteryAttempts || 0)
  const windowCorrect = Number(historical?.masteryCorrect || 0)
  const windowRate = windowAttempts > 0 ? windowCorrect / windowAttempts : 0

  if (weekly?.status === 'mastered') return 'mastered_week'
  if (monthly?.status === 'mastered') return 'mastered_month'
  if (historical?.status === 'mastered') return 'mastered_older'
  if (attempts === 0) return 'empty'
  if (windowAttempts >= MASTERY_MIN_ATTEMPTS && windowRate < 0.5) return 'struggling'
  if (windowAttempts >= MASTERY_MIN_ATTEMPTS && windowRate < MASTERY_MIN_SUCCESS_RATE) return 'difficult'
  return 'started'
}

export function getCompactMasteryConcern(historical) {
  const attempts = Number(historical?.masteryAttempts || 0)
  if (attempts < MASTERY_MIN_ATTEMPTS) return null
  const rate = Number(historical?.masteryCorrect || 0) / attempts
  if (rate < 0.5) return 'many_errors'
  if (rate < MASTERY_MIN_SUCCESS_RATE) return 'below_threshold'
  return null
}

const COMPACT_MASTERY_COLORS = {
  mastered_week: 'bg-emerald-600 text-white',
  mastered_month: 'bg-emerald-300 text-emerald-900',
  mastered_older: 'border-2 border-emerald-400 bg-white text-emerald-700',
  struggling: 'bg-red-300 text-red-900',
  difficult: 'bg-orange-200 text-orange-900',
  started: 'bg-blue-200 text-blue-800',
  empty: 'bg-gray-100 text-gray-400'
}

export function getCompactMasteryColorClass(historical, weekly, monthly) {
  return COMPACT_MASTERY_COLORS[getCompactMasteryStatus(historical, weekly, monthly)]
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
