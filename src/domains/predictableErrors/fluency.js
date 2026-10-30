import { digitByDigitSum } from '../arithmetic/errorHypotheses/commonHypotheses.js'
import { candidateResult, entryAndNearMissPredictions, prediction, unavailable } from './core.js'

export function fluencyCandidates(problem, answer) {
  const v = problem?.values ?? {}, skill = problem?.skill ?? problem?.type
  const small = n => Number.isInteger(n) && n >= 0 && n <= 100
  if (skill === 'number_bonds' && small(v.target) && small(v.knownTerm) && v.knownTerm <= v.target) {
    return candidateResult({ domain: 'number_fluency', scope: 'number_bonds', correct: v.target - v.knownTerm, answer, predictions: [
      prediction('bond_sum_instead_of_missing', v.target + v.knownTerm, 'Svaret matchar summan av måltal och känd term.'),
      prediction('bond_known_term_returned', v.knownTerm, 'Den kända termen kan ha skrivits i svarsfältet.'),
      prediction('bond_target_returned', v.target, 'Måltalet kan ha skrivits i stället för den saknade termen.'),
      ...entryAndNearMissPredictions(v.target - v.knownTerm, { offByOne: true }),
    ] })
  }
  if (skill !== 'doubles' || !small(v.value) || v.doubled !== 2 * v.value) return unavailable('number_fluency')
  if (['double_missing_factor', 'double_halving_transfer'].includes(v.form)) return candidateResult({ domain: 'number_fluency',
    scope: 'inverse_double', correct: v.value, answer, predictions: [prediction('double_known_product_returned', v.doubled, 'Produkten kan ha lämnats i stället för saknad faktor eller hälft.'),
      prediction('double_instead_of_half', 2 * v.doubled, 'Svaret matchar dubblering av det visade produktvärdet.') ] })
  if (!['double_addition', 'double_two_times', 'double_times_two', 'double_mixed_multiplication', 'double_mixed_addition'].includes(v.form)) return unavailable('number_fluency')
  return candidateResult({ domain: 'number_fluency', scope: 'forward_double', correct: v.doubled, answer, predictions: [
    prediction('double_no_carry', digitByDigitSum(v.value, v.value), 'Svaret matchar dubblering utan överförd minnessiffra; räknemetoden behöver belägg.'),
    prediction('double_original_returned', v.value, 'Det ursprungliga talet kan ha lämnats utan dubblering.'),
    ...entryAndNearMissPredictions(v.doubled, { offByOne: true }),
  ] })
}
