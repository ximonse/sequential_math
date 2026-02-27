import { inferOperationFromProblemType, inferTableFromProblem, median, getSpeedTime } from '../../../lib/mathUtils'
import { getOperationLabel } from '../../../lib/operations'
import { getStartOfWeekTimestamp } from '../../../lib/studentProfile'
import { buildNcmDetailForStudent } from './dashboardStudentDetailNcmHelpers'
import {
  buildStickyTableStatusForStudent,
  getTableProblemSourceForStudent,
  isKnowledgeError
} from './dashboardTableStatusUtils'

const ALL_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division', 'algebra_evaluate', 'algebra_simplify', 'arithmetic_expressions', 'fractions', 'percentage']
const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const LEVELS = Array.from({ length: 12 }, (_, index) => index + 1)
const DAY_MS = 24 * 60 * 60 * 1000
const MASTERY_MIN_ATTEMPTS = 5
const MASTERY_MIN_SUCCESS_RATE = 0.85

export function buildTeacherStudentViewData(student) {
  if (!student) return null
  const tableSticky = buildStickyTableStatusForStudent(student)
  const tablePerformanceByTable = buildTablePerformanceByTable(student)
  const tableRecencyByTable = buildTableRecencyByTable(student)
  const operationMasteryBoards = buildOperationMasteryBoardsForTeacher(student)
  const levelErrorRows = buildLevelErrorRowsForTeacher(student)
  const ncmDetail = buildNcmDetailForStudent(student)

  return {
    tableSticky,
    tablePerformanceByTable,
    tableRecencyByTable,
    operationMasteryBoards,
    levelErrorRows,
    ncmDetail
  }
}

function buildOperationMasteryBoardsForTeacher(student) {
  const problems = getTableProblemSourceForStudent(student)
  const weekStart = getStartOfWeekTimestamp()
  const buckets = Object.fromEntries(
    ALL_OPERATIONS.map(operation => [operation, createOperationLevelBucketsForTeacher()])
  )

  for (const result of problems) {
    const operation = inferOperationFromProblemType(result.problemType)
    if (!Object.prototype.hasOwnProperty.call(buckets, operation)) continue

    const level = Math.round(Number(result?.difficulty?.conceptual_level || 0))
    if (!Number.isInteger(level) || level < 1 || level > 12) continue

    buckets[operation].historical[level].attempts += 1
    if (result.correct) buckets[operation].historical[level].correct += 1

    if (Number(result.timestamp || 0) >= weekStart) {
      buckets[operation].weekly[level].attempts += 1
      if (result.correct) buckets[operation].weekly[level].correct += 1
    }
  }

  return ALL_OPERATIONS.map(operation => ({
    operation,
    historical: LEVELS.map(level => buildTeacherLevelView(level, buckets[operation].historical[level])),
    weekly: LEVELS.map(level => buildTeacherLevelView(level, buckets[operation].weekly[level]))
  }))
}

function buildLevelErrorRowsForTeacher(student) {
  const source = getTableProblemSourceForStudent(student)
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

function createOperationLevelBucketsForTeacher() {
  const makeLevelMap = () => Object.fromEntries(
    LEVELS.map(level => [level, { attempts: 0, correct: 0 }])
  )

  return {
    historical: makeLevelMap(),
    weekly: makeLevelMap()
  }
}

function buildTeacherLevelView(level, bucket = {}) {
  const attempts = Number(bucket.attempts || 0)
  const correct = Number(bucket.correct || 0)
  const successRate = attempts > 0 ? correct / attempts : 0
  const isMastered = attempts >= MASTERY_MIN_ATTEMPTS && successRate >= MASTERY_MIN_SUCCESS_RATE
  const isStarted = attempts > 0
  const status = isMastered ? 'mastered' : (isStarted ? 'started' : 'empty')
  const successPercent = Math.round(successRate * 100)

  return {
    level,
    attempts,
    correct,
    successRate,
    status,
    metricsLabel: isStarted ? `${correct}/${attempts}` : '-',
    title: isStarted
      ? `Nivå ${level}: ${correct}/${attempts} rätt (${successPercent}%)`
      : `Nivå ${level}: ingen träning ännu`
  }
}

function buildTableRecencyByTable(student) {
  const source = getTableProblemSourceForStudent(student)
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
  const source = getTableProblemSourceForStudent(student)
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
