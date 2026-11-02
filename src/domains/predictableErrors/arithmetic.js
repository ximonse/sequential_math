import { digitByDigitSum, digitByDigitAbsDiff, getSwapAnswer } from '../arithmetic/errorHypotheses/commonHypotheses.js'
import { predictExchangeNotDecremented, predictNoBorrowAnswer, predictSecondExchangeInverted } from '../arithmetic/errorHypotheses/subtractionHypotheses.js'
import { predictDecimalPartsSeparately } from '../arithmetic/errorHypotheses/multiplicationHypotheses.js'
import { subtractionCandidates } from '../arithmetic/subtractionCandidates.js'
import { divRemainderAsOnes, divRemainderIgnored, divZeroDropped, mulCarryAddedBefore, mulCarryForgotten, mulColumnwise, mulPartialsConcatenated, mulRows } from './writtenMulDiv.js'
import { candidateResult, entryAndNearMissPredictions, prediction, unavailable, numeric } from './core.js'

// Columns (0 = ones) that receive a carry in a whole-number addition.
function carryColumns(a, b) {
  const columns = []
  let carry = 0
  for (let column = 0, x = a, y = b; x > 0 || y > 0 || carry; column++, x = Math.floor(x / 10), y = Math.floor(y / 10)) {
    if (carry) columns.push(column)
    carry = (x % 10) + (y % 10) + carry >= 10 ? 1 : 0
  }
  return columns
}

// The last two digits written in the wrong order (74 − 3 = 17, 283 + 462 = 754).
export function swapLastTwoDigits(value) {
  if (!Number.isSafeInteger(value) || value < 10) return null
  const text = String(value)
  return Number(`${text.slice(0, -2)}${text.at(-1)}${text.at(-2)}`)
}

export function arithmeticCandidates(problem, answer) {
  const { a: rawA, b: rawB } = problem?.values ?? {}, a = numeric(rawA), b = numeric(rawB)
  const op = problem?.type ?? problem?.skill
  if (a === null || b === null || Math.abs(a) > 10000 || Math.abs(b) > 10000) return unavailable('arithmetic')
  if (!['addition', 'subtraction', 'multiplication', 'division'].includes(op) || (op === 'division' && b === 0)
    || (op === 'subtraction' && (a < 0 || b < 0 || a < b))) return unavailable('arithmetic')
  const correct = op === 'addition' ? a + b : op === 'subtraction' ? a - b : op === 'multiplication' ? a * b : a / b
  const predictions = [prediction('operation_swap', getSwapAnswer(op, a, b), 'Svaret matchar det alternativa räknesättets beräkning; orsaken är inte fastställd.')]
  const decimals = !Number.isInteger(a) || !Number.isInteger(b)
  if (op === 'subtraction' && !decimals) {
    predictions.push(...subtractionCandidates({ a, b, studentAnswer: answer }).predictions,
      prediction('exchange_not_decremented', predictExchangeNotDecremented(a, b),
        'Svaret matchar växling i kolumnen utan att kolumnen till vänster minskas.'))
    const inverted = predictSecondExchangeInverted(a, b)
    if (inverted !== null) predictions.push(prediction('second_exchange_inverted', inverted,
      'Svaret matchar att första växlingen görs rätt men att nästa kolumn som behöver växlas, eller en nolla, räknas som större minus mindre (0 − x = x).'))
  }
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
    // Only one of several carries is forgotten (357 + 268 = 525: the carry into the hundreds).
    const carries = carryColumns(a, b)
    if (carries.length >= 2) for (const column of carries) predictions.push(prediction('one_carry_forgotten', a + b - 10 ** column,
      `Svaret matchar att en av flera minnessiffror glömts (den till ${['entalen', 'tiotalen', 'hundratalen', 'tusentalen'][column] ?? 'en högre kolumn'}).`))
  }
  if (op === 'subtraction' && !decimals && a >= 10 && a % 10 >= b % 10 && a - b >= 10) {
    // The tens are decreased although the ones need no exchange (82 − 2 = 70).
    predictions.push(prediction('unnecessary_exchange', a - b - 10,
      'Svaret matchar att tiotalet minskats trots att entalen inte behövde växlas. Kan också vara slarv med tio.'))
  }
  if (op === 'subtraction' && !decimals && a >= 100 && a % 10 < b % 10
    && Math.floor(a / 10) % 10 - 1 >= Math.floor(b / 10) % 10 && a - b >= 100) {
    // After an exchange in the ones the hundreds are decreased too (371 − 145 = 126).
    predictions.push(prediction('unnecessary_exchange', a - b - 100,
      'Svaret matchar att hundratalet också minskats fast tiotalet inte behövde växlas. Kan också vara slarv med hundra.'))
  }
  if (op === 'addition' && [a, b].every(n => Number.isSafeInteger(n) && n >= 0) && (a % 10) + (b % 10) < 10 && a + b >= 10) {
    // A carry is added although the ones need none (41 + 6 = 57).
    predictions.push(prediction('phantom_carry', a + b + 10,
      'Svaret matchar en minnessiffra i tiotalen fast entalen inte gav någon. Kan också vara slarv med tio.'))
  }
  if ([a, b].every(Number.isSafeInteger) && Number.isSafeInteger(correct)) {
    const swapped = swapLastTwoDigits(correct)
    if (swapped !== null && swapped !== correct) predictions.push(prediction('last_two_digits_swapped', swapped,
      'Svaret har facits två sista siffror i omvänd ordning; troligen en inmatnings- eller avskrivningsmiss, inte ett räknefel.'))
  }
  if (op === 'multiplication' && [a, b].every(n => Number.isSafeInteger(n) && n >= 0)) {
    predictions.push(prediction('ones_digits_only', (a % 10) * (b % 10), 'Svaret matchar multiplikation av enbart entalssiffrorna.'))
    for (const wrong of [a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b]) {
      if (wrong >= 0) predictions.push(prediction('table_off_by_one', wrong, 'Svaret matchar en angränsande produkt, inte en bevisad minnesorsak.'))
    }
  }
  if (op === 'multiplication' && decimals) {
    const wrong = predictDecimalPartsSeparately(a, b)
    if (wrong !== null) predictions.push(prediction('decimal_parts_multiplied_separately', wrong,
      'Svaret matchar heltal och decimaldel multiplicerade var för sig och skrivna ihop.'))
  }
  // Off-by-one only for single-digit table facts, where counting a step wrong is plausible.
  const tableFact = op === 'multiplication' && [a, b].every(n => Number.isInteger(n) && n >= 0 && n <= 10)
  predictions.push(...entryAndNearMissPredictions(correct, { offByOne: tableFact }))
  if (op === 'multiplication' && [a, b].every(n => Number.isSafeInteger(n) && n >= 0)) {
    const [big, small] = a >= b ? [a, b] : [b, a]
    if (big >= 10 && small >= 2 && small <= 9) {
      predictions.push(prediction('mul_carry_forgotten', mulCarryForgotten(big, small), 'Svaret matchar att minnessiffran inte förs vidare i multiplikationen.'),
        prediction('mul_carry_added_before', mulCarryAddedBefore(big, small), 'Svaret matchar att minnessiffran läggs till siffran före multiplikationen i stället för efter.'),
        prediction('mul_partials_concatenated', mulPartialsConcatenated(big, small), 'Svaret matchar att varje siffras produkt skrivs efter varandra.'),
        prediction('mul_columnwise', mulColumnwise(big, small), 'Svaret matchar att bara siffror i samma kolumn multipliceras, som vid addition.'))
    }
    if (a >= 10 && b >= 10 && b <= 99) {
      predictions.push(prediction('mul_carry_forgotten', mulRows(a, b, 'carry_forgotten'), 'Svaret matchar att minnessiffrorna inte förs vidare i delprodukterna.'),
        prediction('mul_carry_added_before', mulRows(a, b, 'carry_added_before'), 'Svaret matchar att minnessiffran läggs till siffran före multiplikationen.'),
        prediction('mul_no_row_shift', mulRows(a, b, 'no_row_shift'), 'Svaret matchar att den andra delprodukten inte flyttas ett steg åt vänster.'),
        prediction('mul_columnwise', mulColumnwise(a, b), 'Svaret matchar att bara siffror i samma kolumn multipliceras, som vid addition.'))
    }
  }
  if (op === 'division' && Number.isSafeInteger(a) && Number.isSafeInteger(b) && a >= 10 && b >= 2 && b <= 9 && a % b === 0) {
    predictions.push(prediction('div_remainder_ignored', divRemainderIgnored(a, b), 'Svaret matchar kort division där resten inte förs vidare till nästa siffra.'),
      prediction('div_remainder_as_ones', divRemainderAsOnes(a, b), 'Svaret matchar att resten läggs till som ental i stället för som tiotal.'))
    const dropped = divZeroDropped(a / b)
    if (dropped !== null) predictions.push(prediction('div_zero_dropped', dropped, 'Svaret matchar att nollan i kvoten har fallit bort.'))
    for (const wrong of [a / b - 1, a / b + 1]) predictions.push(prediction('quotient_off_by_one', wrong, 'Kvoten är ett ifrån; kan vara osäker tabellkunskap eller felräkning.'))
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
