import { evaluateExpression } from '../expressionMath.js'
import { candidateResult, prediction, unavailable, normalizeText } from './core.js'

export function linearForm(value) {
  const raw = normalizeText(value)
  if (/^[+-]?\d+$/.test(raw)) return Number.isSafeInteger(Number(raw)) && Math.abs(Number(raw)) <= 1e6
    ? { variable: 'x', coefficient: 0, constant: Number(raw) } : null
  const m = /^([+-]?\d*)([a-z])(?:([+-]\d+))?$/.exec(raw)
  if (!m) return null
  const coefficient = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : Number(m[1])
  const constant = Number(m[3] ?? 0)
  return [coefficient, constant].every(n => Number.isSafeInteger(n) && Math.abs(n) <= 1e6)
    ? { variable: m[2], coefficient, constant } : null
}
export const sameLinear = (a, b) => a !== null && b !== null && a.coefficient === b.coefficient
  && a.constant === b.constant && (a.coefficient === 0 || a.variable === b.variable)
const linearText = (a, v, b = 0) => a === 0 ? String(b) : `${a}${v}${b > 0 ? '+' : ''}${b || ''}`

export function algebraCandidates(problem, answer) {
  const raw = normalizeText(problem?.values?.expression), variables = problem?.values?.variables ?? {}
  if (raw.length > 160) return unavailable('algebra')
  const match = /^(\d+)([a-z])(?:([+-]\d+))?$/.exec(raw)
  if (problem?.skill === 'algebra_simplify') {
    const terms = raw.match(/[+-]?[^+-]+/g) ?? []
    if (terms.join('') !== raw) return unavailable('algebra')
    let a = 0, b = 0, v = null
    for (const term of terms) {
      const parsed = linearForm(term)
      if (!parsed || (parsed.coefficient !== 0 && v !== null && v !== parsed.variable)) return unavailable('algebra')
      if (parsed.coefficient !== 0) v = parsed.variable
      a += parsed.coefficient; b += parsed.constant
    }
    if (!v || !a || !b || Math.abs(a) > 10000 || Math.abs(b) > 10000) return unavailable('algebra')
    const predictions = [prediction('algebra_constant_dropped', linearText(a, v), 'Svaret matchar att konstanten utelämnas.'),
      prediction('algebra_unlike_terms_combined', linearText(a + b, v), 'Variabelkoefficient och konstant kan ha räknats ihop.'),
      prediction('algebra_variable_dropped', String(a + b), 'Svaret matchar summan av koefficient och konstant utan variabel.')]
    return candidateResult({ domain: 'algebra', correct: linearText(a, v, b), answer, predictions,
      scope: 'algebra_simplify', answerType: 'linear', parse: linearForm, equal: sameLinear, coverageIds: ['M20'] })
  }
  if (!['algebra_evaluate', 'algebra'].includes(problem?.skill ?? problem?.type)) return unavailable('algebra')
  if (match) {
    const [, c, v, tail] = match, a = Number(c), x = variables[v], b = Number(tail ?? 0)
    if (typeof x !== 'number' || !Number.isFinite(x) || Math.abs(x) > 10000 || a > 10000 || Math.abs(b) > 10000) return unavailable('algebra')
    return candidateResult({ domain: 'algebra', scope: 'algebra_evaluate', correct: evaluateExpression(raw, variables), answer, coverageIds: ['M19'], predictions: [
      prediction('algebra_coefficient_dropped', x + b, 'Svaret matchar uttrycket utan den faktiska koefficienten.'),
      prediction('algebra_coefficient_added', a + x + b, 'Svaret matchar addition av den faktiska koefficienten i stället för multiplikation.'),
    ] })
  }
  const square = /^([a-z])\*\1$/.exec(raw)
  if (square && typeof variables[square[1]] === 'number' && Number.isFinite(variables[square[1]]) && Math.abs(variables[square[1]]) <= 10000) {
    const x = variables[square[1]]
    return candidateResult({ domain: 'algebra', scope: 'algebra_evaluate', correct: x * x, answer, coverageIds: ['M19'], predictions: [
      prediction('algebra_square_as_double', 2 * x, 'Svaret matchar dubbla variabelvärdet i stället för dess kvadrat.') ] })
  }
  return unavailable('algebra')
}
