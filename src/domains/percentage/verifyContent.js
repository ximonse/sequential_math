import { nearlyEqual } from '../expressionMath.js'

export function verifyPercentageContent(problem) {
  const values = problem?.values || {}
  const kind = String(values.kind || '')
  const percentage = Number(values.percentage)
  const base = Number(values.base)
  const part = Number(values.part)
  const total = Number(values.total)
  let expected = Number.NaN

  if (kind === 'percent_of') expected = percentage * base / 100
  else if (kind === 'discount') expected = base * (1 - percentage / 100)
  else if (kind === 'increase') expected = base * (1 + percentage / 100)
  else if (kind === 'share' && total !== 0) expected = part / total * 100

  const actual = Number(problem?.answer?.correct ?? problem?.answer?.value)
  return {
    valid: nearlyEqual(expected, actual),
    reason: `expected ${expected}, received ${actual}`
  }
}
