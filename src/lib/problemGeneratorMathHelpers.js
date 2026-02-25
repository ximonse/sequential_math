export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function roundTo(value, decimals = 6) {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function getDecimalPlaces(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  const text = String(numeric)
  if (text.includes('e') || text.includes('E')) {
    const fixed = numeric.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
    const dot = fixed.indexOf('.')
    return dot === -1 ? 0 : fixed.length - dot - 1
  }
  const dotIndex = text.indexOf('.')
  return dotIndex === -1 ? 0 : text.length - dotIndex - 1
}

function toScaledInt(value, scale) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** scale
  return Math.round(roundTo(Math.abs(value), scale) * factor)
}

export function randomFromConstraint(constraint) {
  const { min, max, step } = constraint

  if (typeof step === 'number' && step > 0 && step < 1) {
    const steps = Math.floor((max - min) / step)
    const n = Math.floor(Math.random() * (steps + 1))
    return roundTo(min + n * step, 6)
  }

  return randomInt(min, max)
}

function asFiniteNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function inRange(value, min, max) {
  const lowerOk = min === null || value >= min
  const upperOk = max === null || value <= max
  return lowerOk && upperOk
}

export function pickExactDivisionOperands(constraints) {
  const b = randomFromConstraint(constraints.b)
  if (!Number.isFinite(b) || !Number.isInteger(b) || b === 0) return null

  const aMin = asFiniteNumber(constraints?.a?.min)
  const aMax = asFiniteNumber(constraints?.a?.max)
  const resultMinRaw = asFiniteNumber(constraints?.result?.min)
  const resultMaxRaw = asFiniteNumber(constraints?.result?.max)

  let qMin = resultMinRaw === null ? 1 : Math.ceil(resultMinRaw)
  let qMax = resultMaxRaw === null ? Math.max(qMin, 5000) : Math.floor(resultMaxRaw)

  if (aMin !== null) {
    qMin = Math.max(qMin, Math.ceil(aMin / b))
  }
  if (aMax !== null) {
    qMax = Math.min(qMax, Math.floor(aMax / b))
  }

  if (qMin > qMax) return null

  const quotient = randomInt(qMin, qMax)
  const a = b * quotient
  if (!inRange(a, aMin, aMax)) return null

  return { a, b }
}

export function pickExactDivisionFallbackOperands(constraints) {
  const bMinRaw = asFiniteNumber(constraints?.b?.min)
  const bMaxRaw = asFiniteNumber(constraints?.b?.max)
  if (bMinRaw === null || bMaxRaw === null) return null

  const bMin = Math.ceil(Math.min(bMinRaw, bMaxRaw))
  const bMax = Math.floor(Math.max(bMinRaw, bMaxRaw))
  if (bMin > bMax) return null

  const aMin = asFiniteNumber(constraints?.a?.min)
  const aMax = asFiniteNumber(constraints?.a?.max)
  const resultMinRaw = asFiniteNumber(constraints?.result?.min)
  const resultMaxRaw = asFiniteNumber(constraints?.result?.max)

  for (let b = bMin; b <= bMax; b++) {
    if (b === 0) continue

    let qMin = resultMinRaw === null ? 1 : Math.ceil(resultMinRaw)
    let qMax = resultMaxRaw === null ? Math.max(qMin, 5000) : Math.floor(resultMaxRaw)

    if (aMin !== null) {
      qMin = Math.max(qMin, Math.ceil(aMin / b))
    }
    if (aMax !== null) {
      qMax = Math.min(qMax, Math.floor(aMax / b))
    }

    if (qMin > qMax) continue
    const quotient = qMin
    const a = b * quotient
    if (!inRange(a, aMin, aMax)) continue
    return { a, b }
  }

  return null
}

export function countCarries(a, b) {
  const scale = Math.max(getDecimalPlaces(a), getDecimalPlaces(b))
  const aScaled = toScaledInt(a, scale)
  const bScaled = toScaledInt(b, scale)
  const maxLen = Math.max(String(aScaled).length, String(bScaled).length)
  const aStr = String(aScaled).padStart(maxLen, '0')
  const bStr = String(bScaled).padStart(maxLen, '0')

  let carryCount = 0
  let carry = 0

  for (let i = aStr.length - 1; i >= 0; i--) {
    const sum = parseInt(aStr[i], 10) + parseInt(bStr[i], 10) + carry
    if (sum >= 10) {
      carryCount++
      carry = 1
    } else {
      carry = 0
    }
  }

  return carryCount
}

export function countBorrows(a, b) {
  const scale = Math.max(getDecimalPlaces(a), getDecimalPlaces(b))
  const topScaled = toScaledInt(a, scale)
  const bottomScaled = toScaledInt(b, scale)
  const maxLen = Math.max(String(topScaled).length, String(bottomScaled).length)
  const aStr = String(topScaled).padStart(maxLen, '0')
  const bStr = String(bottomScaled).padStart(maxLen, '0')

  let borrowCount = 0
  let borrow = 0

  for (let i = aStr.length - 1; i >= 0; i--) {
    const top = parseInt(aStr[i], 10) - borrow
    const bottom = parseInt(bStr[i], 10)
    if (top < bottom) {
      borrowCount++
      borrow = 1
    } else {
      borrow = 0
    }
  }

  return borrowCount
}

export function countMultiplicationCarries(a, b) {
  const aScale = getDecimalPlaces(a)
  const bScale = getDecimalPlaces(b)
  const aDigits = String(toScaledInt(a, aScale))
    .split('')
    .map(d => Number(d))
    .reverse()
  const bDigits = String(toScaledInt(b, bScale))
    .split('')
    .map(d => Number(d))
    .reverse()

  let carryCount = 0
  for (const bDigit of bDigits) {
    let carry = 0
    for (const aDigit of aDigits) {
      const product = aDigit * bDigit + carry
      if (product >= 10) carryCount++
      carry = Math.floor(product / 10)
    }
    if (carry > 0) carryCount++
  }

  return carryCount
}

export function hasCarry(a, b) {
  return countCarries(a, b) > 0
}

export function isTrivial(a, b) {
  return a <= 1 || b <= 1
}

export function isConfusing(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false
  if (a === b) return true

  const aDigits = String(a).split('').sort().join('')
  const bDigits = String(b).split('').sort().join('')
  if (aDigits === bDigits && a !== b) return true

  return false
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
