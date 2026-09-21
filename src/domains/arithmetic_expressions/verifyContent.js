import { evaluateExpression, nearlyEqual } from '../expressionMath.js'

export function verifyArithmeticExpressionsContent(problem) {
  try {
    const expression = String(problem?.values?.text || problem?.display?.text || '')
    const expected = evaluateExpression(expression)
    const actual = Number(problem?.answer?.value ?? problem?.answer?.correct)
    return {
      valid: nearlyEqual(expected, actual),
      reason: `expected ${expected}, received ${actual}`
    }
  } catch (error) {
    return { valid: false, reason: String(error?.message || error) }
  }
}
