import { inferOperationFromProblemType } from '../../../lib/mathUtils'
import { getTableProblemSourceForStudent } from './dashboardTableStatusUtils'
import { ALL_OPERATIONS, LEVELS, MASTERY_MIN_ATTEMPTS, MASTERY_MIN_SUCCESS_RATE } from './dashboardConstants'

export function buildClassMasteryRows(filteredStudents) {
  if (!Array.isArray(filteredStudents)) return []

  return filteredStudents.map(student => {
    const levels = buildEffectiveLevels(student)
    const values = ALL_OPERATIONS.map(op => levels[op])
    const nonZero = values.filter(v => v > 0)
    const average = nonZero.length > 0
      ? nonZero.reduce((sum, v) => sum + v, 0) / nonZero.length
      : 0

    return {
      studentId: student.studentId,
      name: student.name || student.studentId,
      className: student.className || '',
      levels,
      average
    }
  })
}

function buildEffectiveLevels(student) {
  const source = getTableProblemSourceForStudent(student)
  const buckets = {}
  for (const op of ALL_OPERATIONS) {
    buckets[op] = {}
    for (const level of LEVELS) {
      buckets[op][level] = { attempts: 0, correct: 0 }
    }
  }

  for (const problem of source) {
    const op = inferOperationFromProblemType(problem?.problemType || '')
    if (!buckets[op]) continue
    const level = Math.round(Number(problem?.difficulty?.conceptual_level || 0))
    if (!Number.isInteger(level) || level < 1 || level > 12) continue
    buckets[op][level].attempts += 1
    if (problem.correct) buckets[op][level].correct += 1
  }

  const result = {}
  for (const op of ALL_OPERATIONS) {
    result[op] = 0
    for (const level of LEVELS) {
      const bucket = buckets[op][level]
      if (bucket.attempts < MASTERY_MIN_ATTEMPTS) break
      if (bucket.correct / bucket.attempts < MASTERY_MIN_SUCCESS_RATE) break
      result[op] = level
    }
  }

  return result
}

export function getLevelColorClass(level) {
  if (!level || level <= 0) return 'bg-gray-100 text-gray-400'
  if (level <= 2) return 'bg-red-100 text-red-700'
  if (level <= 4) return 'bg-orange-100 text-orange-700'
  if (level <= 6) return 'bg-amber-100 text-amber-700'
  if (level <= 8) return 'bg-lime-100 text-lime-700'
  if (level <= 10) return 'bg-emerald-200 text-emerald-800'
  return 'bg-emerald-500 text-white'
}

export function getAverageColorClass(avg) {
  if (!avg || avg <= 0) return 'text-gray-400'
  if (avg < 3) return 'text-red-600 font-semibold'
  if (avg < 5) return 'text-orange-600 font-semibold'
  if (avg < 7) return 'text-amber-600 font-semibold'
  return 'text-emerald-600 font-semibold'
}
