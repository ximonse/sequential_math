import { computeEffectiveLevels, getPreferredProblemSource } from '../../../lib/masteryCalculation'
import { ALL_OPERATIONS, LEVELS } from './dashboardConstants'

export function buildClassMasteryRows(filteredStudents) {
  if (!Array.isArray(filteredStudents)) return []

  return filteredStudents.map(student => {
    // Prefer pre-computed levels (stored on profile with full problemLog data).
    // Fall back to computing from available data (may only have recentProblems).
    const stored = student.teacherSummary?.effectiveLevels || student.effectiveLevels
    let levels
    if (stored && typeof stored === 'object') {
      levels = Object.fromEntries(ALL_OPERATIONS.map(op => [op, Number(stored[op]) || 0]))
    } else {
      const source = getPreferredProblemSource(student)
      levels = computeEffectiveLevels(source, ALL_OPERATIONS, LEVELS)
    }
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
