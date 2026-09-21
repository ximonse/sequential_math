import { nearlyEqual } from '../expressionMath.js'

export function verifyArithmeticContent(problem) {
  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  const operation = String(problem?.type || problem?.skill || '')
  let expected = Number.NaN

  if (operation === 'addition') expected = a + b
  else if (operation === 'subtraction') expected = a - b
  else if (operation === 'multiplication') expected = a * b
  else if (operation === 'division' && b !== 0) expected = a / b

  const actual = Number(problem?.answer?.correct ?? problem?.answer?.value)
  return {
    valid: nearlyEqual(expected, actual, 1e-7),
    reason: `expected ${expected}, received ${actual}`
  }
}
