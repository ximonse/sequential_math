/**
 * Beräkningar för "rimlighet" i elevsvar för läraröversikten.
 */

function inferOperation(problemResult) {
  const typeId = problemResult.problemType || ''

  if (typeId.startsWith('add_')) return 'addition'
  if (typeId.startsWith('sub_')) return 'subtraction'
  if (typeId.startsWith('mul_')) return 'multiplication'
  if (typeId.startsWith('div_')) return 'division'

  // Fallback för äldre data
  return 'addition'
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
  const expected = Number(problemResult.correctAnswer)
  const student = Number(problemResult.studentAnswer)

  if (!Number.isFinite(expected) || !Number.isFinite(student)) {
    return {
      isReasonable: false,
      absError: Number.POSITIVE_INFINITY,
      relativeError: Number.POSITIVE_INFINITY,
      tolerance: 0
    }
  }

  const operation = inferOperation(problemResult)
  const level = problemResult.difficulty?.conceptual_level || 1
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

