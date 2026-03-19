import { inferOperationFromProblemType, inferTableFromProblem, median, getSpeedTime } from '../../../lib/mathUtils'
import { computeOperationMasteryBoards, getPreferredProblemSource } from '../../../lib/masteryCalculation'
import { getOperationLabel } from '../../../lib/operations'
import { buildNcmDetailForStudent } from './dashboardStudentDetailNcmHelpers'
import {
  buildStickyTableStatusForStudent,
  isKnowledgeError
} from './dashboardTableStatusUtils'
import { ALL_OPERATIONS, LEVELS, TABLES } from './dashboardConstants'

const DAY_MS = 24 * 60 * 60 * 1000

export function buildTeacherStudentViewData(student) {
  if (!student) return null
  const tableSticky = buildStickyTableStatusForStudent(student)
  const tablePerformanceByTable = buildTablePerformanceByTable(student)
  const tableRecencyByTable = buildTableRecencyByTable(student)
  const operationMasteryBoards = buildOperationMasteryBoardsForTeacher(student)
  const levelErrorRows = buildLevelErrorRowsForTeacher(student)
  const ncmDetail = buildNcmDetailForStudent(student)

  const tableDrillDailyActivity = buildTableDrillDailyActivity(student)

  return {
    tableSticky,
    tablePerformanceByTable,
    tableRecencyByTable,
    tableDrillDailyActivity,
    operationMasteryBoards,
    levelErrorRows,
    ncmDetail
  }
}

function buildOperationMasteryBoardsForTeacher(student) {
  const problems = getPreferredProblemSource(student)
  return computeOperationMasteryBoards(problems, ALL_OPERATIONS, LEVELS)
}

function buildLevelErrorRowsForTeacher(student) {
  const source = getPreferredProblemSource(student)
  const grouped = new Map()

  for (const problem of source) {
    const operation = inferOperationFromProblemType(problem?.problemType || '')
    if (!ALL_OPERATIONS.includes(operation)) continue

    const level = Math.round(Number(problem?.difficulty?.conceptual_level || 0))
    if (!Number.isInteger(level) || level < 1 || level > 12) continue

    const key = `${operation}|${level}`
    const existing = grouped.get(key) || {
      operation,
      operationLabel: getOperationLabel(operation),
      level,
      attempts: 0,
      correct: 0,
      wrong: 0,
      knowledgeWrong: 0,
      inattentionWrong: 0
    }

    existing.attempts += 1
    if (problem?.correct) {
      existing.correct += 1
    } else {
      existing.wrong += 1
      if (isKnowledgeError(problem)) {
        existing.knowledgeWrong += 1
      } else {
        existing.inattentionWrong += 1
      }
    }

    grouped.set(key, existing)
  }

  return Array.from(grouped.values()).map(item => {
    const attempts = Number(item.attempts || 0)
    const correct = Number(item.correct || 0)
    const wrong = Number(item.wrong || 0)
    return {
      ...item,
      attempts,
      correct,
      wrong,
      successRate: attempts > 0 ? correct / attempts : 0,
      errorShare: attempts > 0 ? wrong / attempts : 0
    }
  })
}


function buildTableRecencyByTable(student) {
  const source = getPreferredProblemSource(student)
  const output = Object.fromEntries(
    TABLES.map(table => [table, { lastTrainedAt: null, attemptsTotal: 0, correctTotal: 0 }])
  )

  for (const problem of source) {
    const table = inferTableFromProblem(problem)
    if (!table || !Object.prototype.hasOwnProperty.call(output, table)) continue
    const target = output[table]
    target.attemptsTotal += 1
    if (problem.correct) target.correctTotal += 1
    const ts = Number(problem?.timestamp || 0)
    if (ts > 0 && (target.lastTrainedAt === null || ts > target.lastTrainedAt)) {
      target.lastTrainedAt = ts
    }
  }

  return output
}

function buildTablePerformanceByTable(student) {
  const source = getPreferredProblemSource(student)
  const start7d = Date.now() - (7 * DAY_MS)
  const output = Object.fromEntries(
    TABLES.map(table => [table, {
      attemptsTotal: 0,
      correctTotal: 0,
      accuracyTotal: null,
      attempts7d: 0,
      correct7d: 0,
      accuracy7d: null,
      correctSpeeds7d: [],
      medianSpeed7d: null
    }])
  )

  for (const problem of source) {
    const table = inferTableFromProblem(problem)
    if (!table || !Object.prototype.hasOwnProperty.call(output, table)) continue
    const target = output[table]
    target.attemptsTotal += 1
    if (problem.correct) target.correctTotal += 1

    const ts = Number(problem?.timestamp || 0)
    if (ts >= start7d) {
      target.attempts7d += 1
      if (problem.correct) {
        target.correct7d += 1
        const speed = getSpeedTime(problem)
        if (Number.isFinite(speed) && speed > 0) target.correctSpeeds7d.push(speed)
      }
    }
  }

  for (const table of TABLES) {
    const item = output[table]
    item.accuracyTotal = item.attemptsTotal > 0 ? item.correctTotal / item.attemptsTotal : null
    item.accuracy7d = item.attempts7d > 0 ? item.correct7d / item.attempts7d : null
    item.medianSpeed7d = median(item.correctSpeeds7d)
    delete item.correctSpeeds7d
  }

  return output
}

const DAILY_ACTIVITY_DAYS = 21
const SWEDISH_DAY_ABBR = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör']

function buildTableDrillDailyActivity(student) {
  const source = getPreferredProblemSource(student)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const buckets = []
  for (let i = DAILY_ACTIVITY_DAYS - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    buckets.push({
      date: date.toISOString().slice(0, 10),
      dayStart: date.getTime(),
      count: 0,
      correctCount: 0,
      dayLabel: SWEDISH_DAY_ABBR[date.getDay()],
      dateLabel: `${date.getDate()}/${date.getMonth() + 1}`,
      isToday: i === 0,
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    })
  }

  const oldestStart = buckets[0].dayStart
  for (const problem of source) {
    const table = inferTableFromProblem(problem)
    if (!table) continue
    const ts = Number(problem?.timestamp || 0)
    if (ts < oldestStart) continue
    for (let bi = buckets.length - 1; bi >= 0; bi--) {
      if (ts >= buckets[bi].dayStart) {
        buckets[bi].count += 1
        if (problem.correct) buckets[bi].correctCount += 1
        break
      }
    }
  }

  return buckets
}
