import { tokenize, evaluateExpression } from '../expressionMath.js'
import { candidateResult, prediction, unavailable } from './core.js'

// Only an explicit wrong evaluation policy; correct evaluation is reused.
function alternativeValue(raw, leftToRight, ignoreParentheses) {
  let tokens = tokenize(raw)
  if (tokens.length > 80 || tokens.some(t => !/^\d+(?:\.\d+)?$/.test(t) && !['(', ')', '+', '-', '*', '/'].includes(t))) throw Error('Unsupported expression')
  if (ignoreParentheses) tokens = tokens.filter(t => t !== '(' && t !== ')')
  let index = 0, depth = 0
  const precedence = op => leftToRight ? 1 : ['*', '/'].includes(op) ? 2 : 1
  function primary() {
    if (++depth > 16) throw Error('Expression too deep')
    const token = tokens[index++]; let value
    if (token === '-') value = -primary()
    else if (token === '(') { value = expression(1); if (tokens[index++] !== ')') throw Error('Missing parenthesis') }
    else if (/^\d/.test(token ?? '')) value = Number(token)
    else throw Error('Expected number')
    depth--; return value
  }
  function expression(minimum) {
    let value = primary()
    while (['+', '-', '*', '/'].includes(tokens[index]) && precedence(tokens[index]) >= minimum) {
      const op = tokens[index++], right = expression(precedence(op) + 1)
      if (op === '/' && right === 0) throw Error('Division by zero')
      value = op === '+' ? value + right : op === '-' ? value - right : op === '*' ? value * right : value / right
    }
    return value
  }
  const result = expression(1)
  if (index !== tokens.length) throw Error('Unexpected tail')
  return result
}

export function expressionCandidates(problem, answer) {
  const raw = problem?.values?.text ?? problem?.display?.text
  if (typeof raw !== 'string' || raw.length > 160) return unavailable('arithmetic_expressions')
  try {
    const correct = evaluateExpression(raw), predictions = []
    for (const [id, left, ignore, reason] of [
      ['expression_left_to_right', true, false, 'Svaret matchar räkning från vänster till höger med parenteser kvar.'],
      ['expression_parentheses_ignored', false, true, 'Svaret matchar vanlig prioritering efter att parenteserna tagits bort.'],
      ['expression_left_to_right_no_parentheses', true, true, 'Svaret matchar vänster-till-höger utan parentesernas gruppering.'],
    ]) {
      try { predictions.push(prediction(id, alternativeValue(raw, left, ignore), reason)) } catch { /* This wrong policy may be undefined, e.g. division by zero. */ }
    }
    return candidateResult({ domain: 'arithmetic_expressions', scope: 'numeric_expression', correct, answer, predictions, coverageIds: ['M21'] })
  } catch { return unavailable('arithmetic_expressions') }
}
