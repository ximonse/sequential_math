import { digitByDigitSum, digitByDigitAbsDiff, getSwapAnswer } from '../arithmetic/errorHypotheses/commonHypotheses.js'
import { predictNoBorrowAnswer } from '../arithmetic/errorHypotheses/subtractionHypotheses.js'
import { subtractionCandidates } from '../arithmetic/subtractionCandidates.js'
import { candidateResult, prediction, unavailable, numeric } from './core.js'

export function arithmeticCandidates(problem, answer) {
  const { a: rawA, b: rawB } = problem?.values ?? {}, a = numeric(rawA), b = numeric(rawB)
  const op = problem?.type ?? problem?.skill
  if (a === null || b === null || Math.abs(a) > 10000 || Math.abs(b) > 10000) return unavailable('arithmetic')
  if (!['addition', 'subtraction', 'multiplication', 'division'].includes(op) || (op === 'division' && b === 0)
    || (op === 'subtraction' && (a < 0 || b < 0 || a < b))) return unavailable('arithmetic')
  const correct = op === 'addition' ? a + b : op === 'subtraction' ? a - b : op === 'multiplication' ? a * b : a / b
  const predictions = [prediction('operation_swap', getSwapAnswer(op, a, b), 'Svaret matchar det alternativa räknesättets beräkning; orsaken är inte fastställd.')]
  const decimals = !Number.isInteger(a) || !Number.isInteger(b)
  if (op === 'subtraction' && !decimals) predictions.push(...subtractionCandidates({ a, b, studentAnswer: answer }).predictions)
  if (decimals && ['addition', 'subtraction'].includes(op) && a >= 0 && b >= 0) {
    const places = Math.max(...[a, b].map(n => String(n).split('.')[1]?.length ?? 0))
    if (places <= 3) {
      const scale = 10 ** places, aa = Math.round(a * scale), bb = Math.round(b * scale)
      if (op === 'addition') predictions.push(prediction('carry_forget', digitByDigitSum(aa, bb) / scale,
        'Svaret matchar platsjusterade decimalkolumner utan överförd minnessiffra.'))
      else predictions.push(prediction('smaller_minus_larger', digitByDigitAbsDiff(aa, bb) / scale,
        'Svaret matchar större minus mindre i platsjusterade decimalkolumner.'),
      prediction('borrow_forget', predictNoBorrowAnswer(aa, bb) / scale, 'Svaret matchar noll där växling krävs i platsjusterade decimalkolumner.'))
    }
  }
  if (op === 'addition' && [a, b].every(n => Number.isSafeInteger(n) && n >= 0)) {
    predictions.push(prediction('carry_forget', digitByDigitSum(a, b), 'Svaret matchar kolumnsummor utan överförd minnessiffra.'))
    const width = Math.max(String(a).length, String(b).length), right = String(b).padStart(width, '0')
    const concatenated = String(a).padStart(width, '0').split('').map((digit, i) => String(Number(digit) + Number(right[i]))).join('')
    predictions.push(prediction('column_sums_concatenated', Number(concatenated), 'Svaret matchar kolumnsummor som skrivits efter varandra.'))
  }
  if (op === 'multiplication' && [a, b].every(n => Number.isSafeInteger(n) && n >= 0)) {
    predictions.push(prediction('ones_digits_only', (a % 10) * (b % 10), 'Svaret matchar multiplikation av enbart entalssiffrorna.'))
    for (const wrong of [a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b]) {
      if (wrong >= 0) predictions.push(prediction('table_off_by_one', wrong, 'Svaret matchar en angränsande produkt, inte en bevisad minnesorsak.'))
    }
  }
  if (op === 'division') {
    if (a !== 0) predictions.push(prediction('reversed_operands', b / a, 'Svaret matchar division i omvänd ordning.'))
    predictions.push(prediction('divisor_as_answer', b, 'Svaret är divisorn.'), prediction('dividend_as_answer', a, 'Svaret är dividenden.'))
  }
  for (const factor of [10, 100, 0.1, 0.01]) predictions.push(prediction('place_value_scaling', correct * factor,
    `Svaret matchar facit multiplicerat med ${factor}; detta är en skalningsobservation, inte säker felorsak.`))
  return candidateResult({ domain: 'arithmetic', scope: decimals && ['addition', 'subtraction'].includes(op) ? `decimal_${op}` : op,
    correct, answer, predictions, coverageIds: decimals && ['addition', 'subtraction'].includes(op) ? ['M26']
      : op === 'addition' ? ['M01', 'G1'] : op === 'subtraction' ? ['M02'] : op === 'multiplication' ? ['M03', 'M04'] : ['M05'] })
}
