/**
 * Beräkningar för "rimlighet" i elevsvar för läraröversikten.
 */
import { resolveProblemOperation } from './mathUtils'

function normalizeStoredMetric(value) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function getPrecomputedQuality(problemResult) {
  if (!problemResult || typeof problemResult !== 'object') return null
  if (typeof problemResult.isReasonable !== 'boolean') return null

  const hasStoredQualityField = Object.prototype.hasOwnProperty.call(problemResult, 'absError')
    || Object.prototype.hasOwnProperty.call(problemResult, 'relativeError')
    || Object.prototype.hasOwnProperty.call(problemResult, 'tolerance')

  if (!hasStoredQualityField) return null

  return {
    isReasonable: problemResult.isReasonable,
    absError: normalizeStoredMetric(problemResult.absError),
    relativeError: normalizeStoredMetric(problemResult.relativeError),
    tolerance: normalizeStoredMetric(problemResult.tolerance)
  }
}

function hasDecimal(value) {
  return Number.isFinite(value) && !Number.isInteger(value)
}

function getRelativeTolerance(operation, level, hasDecimals) {
  let base = 0.12

  if (operation === 'multiplication' || operation === 'division') {
    base = 0.16
  }

  const levelBonus = Math.min(0.08, Math.max(0, level - 5) * 0.01)
  const decimalBonus = hasDecimals ? 0.04 : 0

  return base + levelBonus + decimalBonus
}

function getAbsoluteFloor(operation, hasDecimals) {
  if (hasDecimals) return 0.5
  if (operation === 'multiplication' || operation === 'division') return 5
  return 2
}

export function evaluateAnswerQuality(problemResult) {
  const precomputed = getPrecomputedQuality(problemResult)
  if (precomputed) return precomputed

  const expected = Number(problemResult.correctAnswer)
  const student = Number(problemResult.studentAnswer)

  if (!Number.isFinite(expected) || !Number.isFinite(student)) {
    return {
      isReasonable: false,
      absError: null,
      relativeError: null,
      tolerance: null
    }
  }

  const operation = resolveProblemOperation(problemResult, {
    fallback: 'addition',
    allowUnknownPrefix: false
  })
  const level = problemResult.difficulty?.conceptual_level || problemResult.level || 1
  const usesDecimals = hasDecimal(expected)
    || hasDecimal(problemResult.values?.a)
    || hasDecimal(problemResult.values?.b)

  const absError = Math.abs(student - expected)
  const relativeError = absError / Math.max(1, Math.abs(expected))
  const relativeTolerance = getRelativeTolerance(operation, level, usesDecimals)
  const absoluteFloor = getAbsoluteFloor(operation, usesDecimals)
  const tolerance = Math.max(absoluteFloor, Math.abs(expected) * relativeTolerance)

  return {
    isReasonable: absError <= tolerance,
    absError,
    relativeError,
    tolerance
  }
}
