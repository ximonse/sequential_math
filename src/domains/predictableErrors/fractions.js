import { reduce, add, sub, mul, formatFraction } from '../fractions/fractionMath.js'
import { candidateResult, prediction, unavailable } from './core.js'

export function strictFraction(value) {
  const match = /^([+-]?\d+)(?:\/([+-]?\d+))?$/.exec(String(value ?? '').trim())
  if (!match) return null
  const n = Number(match[1]), d = Number(match[2] ?? 1)
  return Number.isSafeInteger(n) && Number.isSafeInteger(d) && Math.abs(n) <= 1e9 && Math.abs(d) <= 1e9 && d !== 0 ? reduce(n, d) : null
}
export const sameFraction = (a, b) => a !== null && b !== null && a.num === b.num && a.den === b.den

export function fractionCandidates(problem, answer) {
  const text = problem?.values?.text ?? problem?.display?.text
  if (typeof text !== 'string' || text.length > 160) return unavailable('fractions')
  const match = /^\s*(\d+)\/(\d+)\s*([+−\-×*])\s*(\d+)(?:\/(\d+))?\s*(?:\(Förenkla svaret\.\))?\s*$/u.exec(text)
  if (!match) return unavailable('fractions')
  const [n1, d1, n2, d2] = [match[1], match[2], match[4], match[5] ?? '1'].map(Number)
  if ([n1, d1, n2, d2].some(n => !Number.isSafeInteger(n) || n < 0 || n > 10000) || !d1 || !d2) return unavailable('fractions')
  const op = match[3], operation = op === '+' ? add : ['−', '-'].includes(op) ? sub : mul
  const correct = operation(n1, d1, n2, d2), predictions = []
  const push = (id, n, d, reason) => { if (d !== 0) { const r = reduce(n, d); predictions.push(prediction(id, formatFraction(r.num, r.den), reason)) } }
  if (op === '+' || op === '−' || op === '-') {
    const sign = op === '+' ? 1 : -1
    push('fraction_components_separately', n1 + sign * n2, d1 + sign * d2, 'Svaret kan produceras genom att räkna täljare och nämnare var för sig.')
    if (d1 !== d2) push('fraction_keep_first_denominator', n1 + sign * n2, d1, 'Svaret kan produceras genom att ändra täljarna utan gemensam nämnare.')
  } else {
    push('fraction_keep_first_denominator', n1 * n2, d1, 'Svaret kan produceras genom att bara multiplicera täljarna och behålla första nämnaren.')
    if (d2 === 1 && n2 > 0) push('fraction_integer_in_denominator', n1, d1 * n2, 'Heltalsfaktorn kan ha multiplicerats in i nämnaren.')
    const sum = add(n1, d1, n2, d2)
    push('fraction_add_instead_of_multiply', sum.num, sum.den, 'Svaret kan produceras genom addition i stället för multiplikation.')
  }
  return candidateResult({ domain: 'fractions', correct: formatFraction(correct.num, correct.den), answer,
    scope: op === '+' ? 'addition' : ['−', '-'].includes(op) ? 'subtraction' : 'multiplication',
    predictions: predictions.map(p => p.modelId === 'fraction_components_separately' ? { ...p, coverageIds: ['G4', 'B7'] } : p),
    answerType: 'fraction', parse: strictFraction, equal: sameFraction, coverageIds: ['M15'] })
}
