import { inferOperationFromProblemType, inferTableFromProblem, getSpeedTime, median } from '../../../lib/mathUtils'
import { getOperationLabel } from '../../../lib/operations'
import { getTableProblemSourceForStudent } from './dashboardTableStatusUtils'

const ALL_OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']
const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const DAY_MS = 24 * 60 * 60 * 1000
const MASTERY_MIN_ATTEMPTS = 5
const MASTERY_MIN_SUCCESS_RATE = 0.85
const TRAINING_MASTERY_THRESHOLD = MASTERY_MIN_SUCCESS_RATE
const TRAINING_MIN_ATTEMPTS = MASTERY_MIN_ATTEMPTS
const TRAINING_MAX_ITEMS = 15

export function buildClassOperationBenchmarks(students) {
  const start7d = Date.now() - (7 * DAY_MS)
  const minAttempts = 10
  const perOp = Object.fromEntries(
    ALL_OPERATIONS.map(op => [op, []])
  )

  for (const student of students) {
    const source = getTableProblemSourceForStudent(student)
    const studentBuckets = Object.fromEntries(
      ALL_OPERATIONS.map(op => [op, { attempts: 0, correct: 0, speeds: [] }])
    )

    for (const problem of source) {
      const ts = Number(problem?.timestamp || 0)
      if (ts < start7d) continue
      const operation = inferOperationFromProblemType(problem?.problemType)
      if (!Object.prototype.hasOwnProperty.call(studentBuckets, operation)) continue
      const bucket = studentBuckets[operation]
      bucket.attempts += 1
      if (problem.correct) {
        bucket.correct += 1
        const speed = getSpeedTime(problem)
        if (Number.isFinite(speed) && speed > 0) bucket.speeds.push(speed)
      }
    }

    for (const op of ALL_OPERATIONS) {
      const bucket = studentBuckets[op]
      if (bucket.attempts >= minAttempts) {
        perOp[op].push({
          accuracy: bucket.correct / bucket.attempts,
          medianSpeed: median(bucket.speeds)
        })
      }
    }
  }

  const result = {}
  for (const op of ALL_OPERATIONS) {
    const entries = perOp[op]
    if (entries.length === 0) {
      result[op] = { accuracy: null, medianSpeed: null, studentCount: 0 }
      continue
    }
    const accSum = entries.reduce((sum, entry) => sum + entry.accuracy, 0)
    const speeds = entries.map(entry => entry.medianSpeed).filter(value => Number.isFinite(value) && value > 0)
    result[op] = {
      accuracy: accSum / entries.length,
      medianSpeed: median(speeds),
      studentCount: entries.length
    }
  }
  return result
}

export function buildTrainingPriorityList(student, classBenchmarks) {
  if (!student) return []
  const source = getTableProblemSourceForStudent(student)
  const abilities = student?.adaptive?.operationAbilities || {}

  const levelData = new Map()
  for (const problem of source) {
    const operation = inferOperationFromProblemType(problem?.problemType)
    if (!ALL_OPERATIONS.includes(operation)) continue
    const level = Math.round(Number(problem?.difficulty?.conceptual_level || 0))
    if (!Number.isInteger(level) || level < 1 || level > 12) continue
    const key = `${operation}|${level}`
    const entry = levelData.get(key) || { attempts: 0, correct: 0, speeds: [] }
    entry.attempts += 1
    if (problem.correct) {
      entry.correct += 1
      const speed = getSpeedTime(problem)
      if (Number.isFinite(speed) && speed > 0) entry.speeds.push(speed)
    }
    levelData.set(key, entry)
  }

  const items = []
  for (const operation of ALL_OPERATIONS) {
    const abilityLevel = Math.round(Number(abilities[operation]) || 1)
    const maxLevel = Math.min(abilityLevel + 2, 12)

    const masteredBelow = new Map()
    for (let level = 1; level <= maxLevel; level++) {
      const key = `${operation}|${level}`
      const data = levelData.get(key)
      const isMastered = data && data.attempts >= TRAINING_MIN_ATTEMPTS &&
        (data.correct / data.attempts) >= TRAINING_MASTERY_THRESHOLD
      masteredBelow.set(level, isMastered)
    }

    for (let level = 1; level <= maxLevel; level++) {
      const key = `${operation}|${level}`
      const data = levelData.get(key)
      const attempts = data?.attempts || 0
      const accuracy = attempts > 0 ? data.correct / attempts : null
      const medianSpeed = data ? median(data.speeds) : null

      if (attempts >= TRAINING_MIN_ATTEMPTS && accuracy >= TRAINING_MASTERY_THRESHOLD) continue

      const allBelowMastered = level === 1 || Array.from({ length: level - 1 }, (_, index) => index + 1)
        .every(lvl => masteredBelow.get(lvl))

      let priority
      let reason
      let reasonLabel
      if (attempts >= TRAINING_MIN_ATTEMPTS && accuracy < 0.5) {
        priority = 'high'
        reason = 'low_accuracy'
        reasonLabel = `Låg träff (${Math.round(accuracy * 100)}%)`
      } else if (attempts === 0 && allBelowMastered) {
        priority = 'high'
        reason = 'not_practiced'
        reasonLabel = 'Ej övat (redo)'
      } else if (attempts >= TRAINING_MIN_ATTEMPTS && accuracy < 0.7) {
        priority = 'medium'
        reason = 'low_accuracy'
        reasonLabel = `Medel träff (${Math.round(accuracy * 100)}%)`
      } else if (attempts === 0 && !allBelowMastered) {
        priority = 'medium'
        reason = 'not_practiced'
        reasonLabel = 'Ej övat (hoppat över?)'
      } else if (attempts >= TRAINING_MIN_ATTEMPTS && accuracy < TRAINING_MASTERY_THRESHOLD) {
        priority = 'low'
        reason = 'low_accuracy'
        reasonLabel = `Nästan (${Math.round(accuracy * 100)}%)`
      } else {
        priority = 'low'
        reason = 'low_data'
        reasonLabel = `Lite data (${attempts} försök)`
      }

      const classOp = classBenchmarks?.[operation]
      items.push({
        operation,
        operationLabel: getOperationLabel(operation),
        level,
        priority,
        reason,
        reasonLabel,
        attempts,
        accuracy,
        medianSpeed: Number.isFinite(medianSpeed) ? medianSpeed : null,
        classAccuracy: classOp?.accuracy ?? null,
        classMedianSpeed: classOp?.medianSpeed ?? null
      })
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  items.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return a.attempts - b.attempts
  })

  return items.slice(0, TRAINING_MAX_ITEMS)
}

export function buildDailyActivityBreakdown(student) {
  if (!student) return []
  const source = getTableProblemSourceForStudent(student)
  const now = new Date()
  const days = []
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(now)
    dayDate.setDate(dayDate.getDate() - i)
    dayDate.setHours(0, 0, 0, 0)
    days.push({
      date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
      dayStart: dayDate.getTime(),
      dayEnd: dayDate.getTime() + DAY_MS,
      attempts: 0,
      correct: 0,
      speeds: [],
      operationSet: new Set()
    })
  }

  for (const problem of source) {
    const ts = Number(problem?.timestamp || 0)
    if (!ts) continue
    for (const day of days) {
      if (ts >= day.dayStart && ts < day.dayEnd) {
        day.attempts += 1
        if (problem.correct) {
          day.correct += 1
          const speed = getSpeedTime(problem)
          if (Number.isFinite(speed) && speed > 0) day.speeds.push(speed)
        }
        const op = inferOperationFromProblemType(problem?.problemType)
        if (ALL_OPERATIONS.includes(op)) day.operationSet.add(op)
        break
      }
    }
  }

  return days.map(day => ({
    date: day.date,
    attempts: day.attempts,
    accuracy: day.attempts > 0 ? day.correct / day.attempts : null,
    medianSpeed: median(day.speeds),
    operations: Array.from(day.operationSet)
  }))
}

export function buildStudentOperationStats7d(student) {
  if (!student) return null
  const start7d = Date.now() - (7 * DAY_MS)
  const source = getTableProblemSourceForStudent(student)
  const buckets = Object.fromEntries(
    ALL_OPERATIONS.map(op => [op, { attempts: 0, correct: 0, speeds: [] }])
  )

  for (const problem of source) {
    const ts = Number(problem?.timestamp || 0)
    if (ts < start7d) continue
    const operation = inferOperationFromProblemType(problem?.problemType)
    if (!Object.prototype.hasOwnProperty.call(buckets, operation)) continue
    buckets[operation].attempts += 1
    if (problem.correct) {
      buckets[operation].correct += 1
      const speed = getSpeedTime(problem)
      if (Number.isFinite(speed) && speed > 0) buckets[operation].speeds.push(speed)
    }
  }

  const result = {}
  for (const op of ALL_OPERATIONS) {
    const bucket = buckets[op]
    result[op] = {
      attempts: bucket.attempts,
      accuracy: bucket.attempts > 0 ? bucket.correct / bucket.attempts : null,
      medianSpeed: median(bucket.speeds)
    }
  }
  return result
}

export function buildClassTableBenchmarks(students) {
  const start7d = Date.now() - (7 * DAY_MS)
  const perTable = Object.fromEntries(TABLES.map(table => [table, []]))

  for (const student of students) {
    const source = getTableProblemSourceForStudent(student)
    const buckets = Object.fromEntries(TABLES.map(table => [table, []]))
    for (const problem of source) {
      const ts = Number(problem?.timestamp || 0)
      if (ts < start7d) continue
      const table = inferTableFromProblem(problem)
      if (!table || !Object.prototype.hasOwnProperty.call(buckets, table)) continue
      if (problem.correct) {
        const speed = getSpeedTime(problem)
        if (Number.isFinite(speed) && speed > 0) buckets[table].push(speed)
      }
    }
    for (const table of TABLES) {
      const value = median(buckets[table])
      if (Number.isFinite(value) && value > 0) perTable[table].push(value)
    }
  }

  const result = {}
  for (const table of TABLES) {
    result[table] = median(perTable[table])
  }
  return result
}
