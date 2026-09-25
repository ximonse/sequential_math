import { computeEffectiveLevels, getPreferredProblemSource } from '../../../lib/masteryCalculation'
import { ALL_OPERATIONS, LEVELS } from './dashboardConstants'

export function buildClassMasteryRows(filteredStudents) {
  if (!Array.isArray(filteredStudents)) return []

  return filteredStudents.map(student => {
    // Prefer pre-computed levels (stored on profile with full problemLog data).
    // Fall back to computing from available data (may only have recentProblems).
    const stored = student.teacherSummary?.effectiveLevels
    let levels
    if (stored && typeof stored === 'object') {
      levels = Object.fromEntries(ALL_OPERATIONS.map(op => [op, normalizeAttainedLevel(stored[op])]))
    } else {
      const source = getPreferredProblemSource(student)
      const computed = computeEffectiveLevels(source, ALL_OPERATIONS, LEVELS, { profile: student })
      levels = Object.fromEntries(ALL_OPERATIONS.map(op => [op, normalizeAttainedLevel(computed[op])]))
    }
    const knownValues = ALL_OPERATIONS.map(op => levels[op]).filter(Number.isInteger)
    const average = averageOrNull(knownValues)
    const lowest = knownValues.length > 0 ? Math.min(...knownValues) : null

    return {
      studentId: student.studentId,
      name: student.name || student.displayAlias || student.studentId,
      className: student.className || '',
      levels,
      average,
      lowest,
      knownCount: knownValues.length,
      totalCount: ALL_OPERATIONS.length
    }
  })
}

export function buildClassMasteryAverages(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null

  const averages = {}
  for (const operation of ALL_OPERATIONS) {
    averages[operation] = averageOrNull(rows.map(row => row.levels?.[operation]).filter(Number.isInteger))
  }
  averages._total = averageOrNull(rows.map(row => row.average).filter(Number.isFinite))
  averages._lowest = averageOrNull(rows.map(row => row.lowest).filter(Number.isInteger))
  return averages
}

// The same rows and averages as the panel, one CSV row per pupil and a last
// Klassmedel row. An empty cell means "not yet attained", never level 0.
// Decimals use a comma so Swedish Excel keeps them numeric.
export function buildClassMasteryExportRows(rows, averages, getLabel = op => op) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  const decimal = value => (Number.isFinite(value) ? value.toFixed(1).replace('.', ',') : '')
  const whole = value => (Number.isInteger(value) ? value : '')
  const pupilRows = rows.map(row => ({
    Elev: row.name,
    ElevID: row.studentId,
    Klass: row.className,
    ...Object.fromEntries(ALL_OPERATIONS.map(op => [getLabel(op), whole(row.levels?.[op])])),
    LägstaBelagda: whole(row.lowest),
    SnittBelagt: decimal(row.average),
    BelagdaOmråden: `${row.knownCount}/${row.totalCount}`
  }))
  if (!averages) return pupilRows
  return [...pupilRows, {
    Elev: 'Klassmedel',
    ElevID: '',
    Klass: '',
    ...Object.fromEntries(ALL_OPERATIONS.map(op => [getLabel(op), decimal(averages[op])])),
    LägstaBelagda: decimal(averages._lowest),
    SnittBelagt: decimal(averages._total),
    BelagdaOmråden: ''
  }]
}

function normalizeAttainedLevel(value) {
  const level = Number(value)
  return Number.isInteger(level) && level >= 1 && level <= 12 ? level : null
}

function averageOrNull(values) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
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
