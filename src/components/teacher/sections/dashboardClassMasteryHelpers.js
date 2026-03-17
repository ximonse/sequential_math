import { inferOperationFromProblemType } from '../../../lib/mathUtils'
import { getTableProblemSourceForStudent } from './dashboardTableStatusUtils'
import { ALL_OPERATIONS, LEVELS, MASTERY_MIN_ATTEMPTS, MASTERY_MIN_SUCCESS_RATE } from './dashboardConstants'

const MASTERY_WINDOW = 10

export function buildClassMasteryRows(filteredStudents) {
  if (!Array.isArray(filteredStudents)) return []

  return filteredStudents.map(student => {
    const levels = buildEffectiveLevels(student)
    const values = ALL_OPERATIONS.map(op => levels[op])
    const average = values.reduce((sum, v) => sum + v, 0) / values.length
    const lowest = Math.min(...values)

    return {
      studentId: student.studentId,
      name: student.name || student.studentId,
      className: student.className || '',
      levels,
      average,
      lowest
    }
  })
}

function buildEffectiveLevels(student) {
  const source = getTableProblemSourceForStudent(student)

  // Collect problems per operation+level, preserving order for windowing
  const problemLists = {}
  for (const op of ALL_OPERATIONS) {
    problemLists[op] = {}
    for (const level of LEVELS) {
      problemLists[op][level] = []
    }
  }

  for (const problem of source) {
    const op = inferOperationFromProblemType(problem?.problemType || '')
    if (!problemLists[op]) continue
    const level = Math.round(Number(problem?.difficulty?.conceptual_level || 0))
    if (!Number.isInteger(level) || level < 1 || level > 12) continue
    problemLists[op][level].push(problem.correct ? 1 : 0)
  }

  const result = {}
  for (const op of ALL_OPERATIONS) {
    result[op] = 0
    for (const level of LEVELS) {
      const all = problemLists[op][level]
      if (all.length < MASTERY_MIN_ATTEMPTS) break
      const windowed = all.slice(-MASTERY_WINDOW)
      const correct = windowed.reduce((s, v) => s + v, 0)
      if (correct / windowed.length < MASTERY_MIN_SUCCESS_RATE) break
      result[op] = level
    }
  }

  return result
}

/**
 * Returns inline style for level dots — high contrast color ramp.
 */
export function getLevelDotStyle(level) {
  if (!level || level <= 0) return { backgroundColor: '#f3f4f6', color: '#b0b5bf', border: '1.5px solid #d1d5db' }
  if (level <= 2) return { backgroundColor: '#fca5a5', color: '#7f1d1d', border: 'none' }
  if (level <= 4) return { backgroundColor: '#fdba74', color: '#7c2d12', border: 'none' }
  if (level <= 6) return { backgroundColor: '#fcd34d', color: '#713f12', border: 'none' }
  if (level <= 8) return { backgroundColor: '#86efac', color: '#14532d', border: 'none' }
  if (level <= 10) return { backgroundColor: '#34d399', color: '#022c22', border: 'none' }
  return { backgroundColor: '#047857', color: '#ffffff', border: 'none' }
}

/**
 * Returns inline style for average/lowest badges.
 */
export function getAverageBadgeStyle(avg) {
  if (!avg || avg <= 0) return { backgroundColor: '#f3f4f6', color: '#9ca3af' }
  if (avg < 3) return { backgroundColor: '#fca5a5', color: '#7f1d1d' }
  if (avg < 5) return { backgroundColor: '#fdba74', color: '#7c2d12' }
  if (avg < 7) return { backgroundColor: '#fcd34d', color: '#713f12' }
  if (avg < 9) return { backgroundColor: '#86efac', color: '#14532d' }
  return { backgroundColor: '#34d399', color: '#022c22' }
}
