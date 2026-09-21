import { evaluateExpression, nearlyEqual } from '../expressionMath.js'

function variablesIn(...expressions) {
  return [...new Set(expressions.flatMap(expression => String(expression || '').match(/[a-zA-Z]+/g) || []))]
}

function assignmentsFor(variables) {
  const seeds = [
    [2, 3, 5, 7],
    [5, 7, 11, 13],
    [-1, 4, -3, 6]
  ]
  return seeds.map(seed => Object.fromEntries(
    variables.map((variable, index) => [variable, seed[index % seed.length]])
  ))
}

function isSimplifiedAnswer(expression, variables) {
  const text = String(expression || '').replace(/\s+/g, '')
  if (!text || /[()]/.test(text)) return false
  return variables.every(variable => {
    const matches = text.match(new RegExp(variable, 'g')) || []
    return matches.length <= 1
  })
}

export function verifyAlgebraContent(problem) {
  try {
    const expression = String(problem?.values?.expression || '')
    if (problem?.skill === 'algebra_evaluate') {
      const expected = evaluateExpression(expression, problem?.values?.variables || {})
      const actual = Number(problem?.answer?.correct ?? problem?.answer?.value)
      return {
        valid: nearlyEqual(expected, actual),
        reason: `expected ${expected}, received ${actual}`
      }
    }

    const answer = String(problem?.answer?.correct || '')
    const variables = variablesIn(expression, answer)
    if (!isSimplifiedAnswer(answer, variables)) {
      return { valid: false, reason: 'answer expression is not simplified' }
    }
    const valid = assignmentsFor(variables).every(assignment => nearlyEqual(
      evaluateExpression(expression, assignment),
      evaluateExpression(answer, assignment)
    ))
    return { valid, reason: valid ? '' : 'answer expression is not equivalent to prompt' }
  } catch (error) {
    return { valid: false, reason: String(error?.message || error) }
  }
}
