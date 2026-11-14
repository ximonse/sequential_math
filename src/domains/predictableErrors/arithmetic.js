import { digitByDigitSum, digitByDigitAbsDiff, getSwapAnswer } from '../arithmetic/errorHypotheses/commonHypotheses.js'
import { predictExchangeNotDecremented, predictNoBorrowAnswer, predictSecondExchangeInverted } from '../arithmetic/errorHypotheses/subtractionHypotheses.js'
import { predictDecimalPartsSeparately } from '../arithmetic/errorHypotheses/multiplicationHypotheses.js'
import { subtractionCandidates } from '../arithmetic/subtractionCandidates.js'
import { divRemainderAsOnes, divRemainderIgnored, divZeroDropped, mulCarryAddedBefore, mulCarryAlwaysOne, mulCarryForgotten, mulColumnwise, mulPartialsConcatenated, mulRows } from './writtenMulDiv.js'
import { addLeftToRight, subLeftToRight } from './leftToRight.js'
import { candidateResult, decimalPlaces, entryAndNearMissPredictions, givingUpPredictions, prediction, unavailable, numeric } from './core.js'
import { decimalSubtractionStructure } from '../arithmetic/decimalSubtractionPackage.js'
import { decimalAdditionStructure } from '../arithmetic/decimalAdditionPackage.js'

const DECIMAL_POINT_ERRORS = new Set(['carry_forget', 'one_carry_forgotten', 'smaller_minus_larger', 'borrow_forget', 'exchange_not_decremented'])

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
  let correct = op === 'addition' ? a + b : op === 'subtraction' ? a - b : op === 'multiplication' ? a * b : a / b
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
      const round = value => Math.round(value * scale) / scale
      // Models from Simon's reading of real answers, 2026-11-12.
      if (op === 'addition') {
        for (const [x, y] of [[a, b], [b, a]]) {
          // Tenths only: with two decimals the answer coincides with the approved package's forgotten carry.
          if (places === 1 && !Number.isInteger(y)) predictions.push(prediction('decimal_only_fraction_added', round(x + y - Math.trunc(y)),
            'Svaret matchar att bara decimaldelen av det ena talet läggs till det andra (2,7 + 1,1 = 2,8).'))
        }
        const tenths = Math.round((a - Math.trunc(a)) * 10) + Math.round((b - Math.trunc(b)) * 10)
        if (decimalPlaces(a) === 1 && decimalPlaces(b) === 1 && tenths >= 10) predictions.push(prediction('decimal_tenths_as_hundredths',
          Math.round((Math.trunc(a) + Math.trunc(b) + tenths / 100) * 100) / 100, 'Svaret matchar att tiondelarnas summa skrivs som hundradelar (4,5 + 6,6 = 10,11).'))
      }
      // A whole number written under the last decimal (6,4 − 2 = 6,2; 1 − 0,75 = 0,74).
      if ([a, b].filter(Number.isInteger).length === 1) {
        const [x, y] = Number.isInteger(a) ? [a / scale, b] : [a, b / scale]
        predictions.push(prediction('decimal_whole_under_last_decimal', round(op === 'addition' ? x + y : Math.abs(x - y)),
          'Svaret matchar att heltalet ställs under den sista decimalen i stället för under heltalen.'))
      }
      if (op === 'addition') {
        predictions.push(prediction('carry_forget', digitByDigitSum(aa, bb) / scale,
          'Svaret matchar platsjusterade decimalkolumner utan överförd minnessiffra.'))
        const structure = decimalAdditionStructure({ a, b })
        if (structure) correct = (aa + bb) / scale
        // Keep every omitted-position variant. Dependent carries are analyzed
        // as an overlap control, but are not eligible pilot source questions.
        if (['independent_carries', 'dependent_carries'].includes(structure)) {
          for (const [amount, position] of [[10, 'tiondelen'], [100, 'hela talet']]) {
            predictions.push(prediction('one_carry_forgotten', (aa + bb - amount) / scale,
              `Svaret matchar en av de två minnessiffrorna tappad, den till ${position}. Andra förklaringar kan överlappa.`))
          }
        }
      }
      else {
        predictions.push(prediction('smaller_minus_larger', digitByDigitAbsDiff(aa, bb) / scale,
        'Svaret matchar större minus mindre i platsjusterade decimalkolumner.'),
        prediction('borrow_forget', predictNoBorrowAnswer(aa, bb) / scale, 'Svaret matchar noll där växling krävs i platsjusterade decimalkolumner.'))
        // Approved decimal pilot: two places, at most one exchange from tenths
        // to hundredths; no zero chain or exchange across the whole boundary.
        if (decimalSubtractionStructure({ a, b })) {
          correct = (aa - bb) / scale
          predictions.push(prediction('exchange_not_decremented', predictExchangeNotDecremented(aa, bb) / scale,
            'Svaret matchar en växling från tiondelar till hundradelar utan att tiondelen minskas.'))
        }
      }
      // A carry or exchange error written without the decimal point (Simon 2026-11-13: 1,76 + 2,58 = 334).
      // Only where dropping the point changes the answer (0 stays 0).
      for (const p of predictions.filter(p => DECIMAL_POINT_ERRORS.has(p.modelId) && Math.round(p.predictedAnswer * scale) !== p.predictedAnswer)) predictions.push(prediction('decimal_point_missing_with_error',
        Math.round(p.predictedAnswer * scale), `${p.reasonSv} Decimaltecknet saknas i svaret.`))
    }
  }
  if (op === 'addition' && [a, b].every(n => Number.isSafeInteger(n) && n >= 0)) {
    predictions.push(prediction('carry_forget', digitByDigitSum(a, b), 'Svaret matchar kolumnsummor utan överförd minnessiffra.'))
    if (a * b !== a + b) predictions.push(prediction('add_multiplied', a * b, 'Svaret matchar att talen multipliceras i stället för att adderas.'))
    const width = Math.max(String(a).length, String(b).length), right = String(b).padStart(width, '0')
    const concatenated = String(a).padStart(width, '0').split('').map((digit, i) => String(Number(digit) + Number(right[i]))).join('')
    predictions.push(prediction('column_sums_concatenated', Number(concatenated), 'Svaret matchar kolumnsummor som skrivits efter varandra.'))
    // Only one of several carries is forgotten (357 + 268 = 525: the carry into the hundreds).
    const carries = carryColumns(a, b)
    if (carries.length >= 2) for (const column of carries) predictions.push(prediction('one_carry_forgotten', a + b - 10 ** column,
      `Svaret matchar att en av flera minnessiffror glömts (den till ${['entalen', 'tiotalen', 'hundratalen', 'tusentalen'][column] ?? 'en högre kolumn'}).`))
  }
  // Left to right only counts where it differs from the forgotten carry or the
  // undecremented exchange; with two digits it always coincides with them.
  if (op === 'addition' && [a, b].every(n => Number.isSafeInteger(n) && n >= 0) && Math.max(a, b) >= 10) {
    const value = addLeftToRight(a, b)
    if (value !== digitByDigitSum(a, b)) predictions.push(prediction('add_left_to_right', value,
      'Svaret matchar att kolumnerna räknas från vänster och att minnessiffran förs till kolumnen till höger.'))
  }
  if (op === 'subtraction' && !decimals && a >= 10) {
    const value = subLeftToRight(a, b)
    if (value !== predictExchangeNotDecremented(a, b)) predictions.push(prediction('sub_left_to_right', value,
      'Svaret matchar att kolumnerna räknas från vänster och att växlingen lånar från kolumnen till höger.'))
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
    // A one-digit whole number times a decimal, read as whole-number multiplication (Simon 2026-11-14).
    const [whole, decimal] = Number.isInteger(a) ? [a, b] : Number.isInteger(b) ? [b, a] : [null, null]
    const places = decimal === null ? 0 : decimalPlaces(decimal)
    if (whole >= 2 && whole <= 9 && decimal > 0 && places >= 1 && places <= 2) {
      const scale = 10 ** places, digits = Math.round(decimal * scale)
      if (digits >= 10) predictions.push(
        prediction('decimal_mul_carry_forgotten', mulCarryForgotten(digits, whole) / scale, 'Svaret matchar att minnessiffran inte förs vidare när decimaltalet multipliceras (3 × 2,4 = 6,2).'),
        prediction('decimal_mul_carry_added_before', mulCarryAddedBefore(digits, whole) / scale, 'Svaret matchar att minnessiffran läggs till siffran före multiplikationen (3 × 2,4 = 9,2).'))
      if (places === 1) {
        // 7 × 6,7 read as 7 + 6 · 7 and calculated from the left: (7 + 6) · 7 = 91.
        const value = (whole + Math.trunc(decimal)) * (digits % 10)
        for (const answer of [value, value / 10]) predictions.push(prediction('decimal_factor_split_left_to_right', answer,
          'Svaret matchar att decimaltalets siffror blir egna tal och att uttrycket räknas från vänster (7 × 6,7 som 7 + 6 · 7 = 91).'))
      }
    }
  }
  // Off-by-one only for single-digit table facts, where counting a step wrong is plausible.
  const tableFact = op === 'multiplication' && [a, b].every(n => Number.isInteger(n) && n >= 0 && n <= 10)
  predictions.push(...entryAndNearMissPredictions(correct, { offByOne: tableFact }), ...givingUpPredictions(correct))
  if (op === 'multiplication' && [a, b].every(n => Number.isSafeInteger(n) && n >= 0)) {
    const [big, small] = a >= b ? [a, b] : [b, a]
    if (big >= 10 && small >= 2 && small <= 9) {
      predictions.push(prediction('mul_carry_forgotten', mulCarryForgotten(big, small), 'Svaret matchar att minnessiffran inte förs vidare i multiplikationen.'),
        prediction('mul_carry_added_before', mulCarryAddedBefore(big, small), 'Svaret matchar att minnessiffran läggs till siffran före multiplikationen i stället för efter.'),
        prediction('mul_carry_always_one', mulCarryAlwaysOne(big, small), 'Svaret matchar att minnessiffran alltid skrivs som 1, oavsett hur stor den är.'),
        prediction('mul_partials_concatenated', mulPartialsConcatenated(big, small), 'Svaret matchar att varje siffras produkt skrivs efter varandra.'),
        prediction('mul_columnwise', mulColumnwise(big, small), 'Svaret matchar att bara siffror i samma kolumn multipliceras, som vid addition.'))
    }
    // Either factor may be written on top (11 × 90 set up as 90 · 11, blind test 3).
    for (const [top, bottom] of a === b ? [[a, b]] : [[a, b], [b, a]]) {
      if (top < 10 || bottom < 10 || bottom > 99) continue
      predictions.push(prediction('mul_carry_forgotten', mulRows(top, bottom, 'carry_forgotten'), 'Svaret matchar att minnessiffrorna inte förs vidare i delprodukterna.'),
        prediction('mul_carry_added_before', mulRows(top, bottom, 'carry_added_before'), 'Svaret matchar att minnessiffran läggs till siffran före multiplikationen.'),
        prediction('mul_carry_always_one', mulRows(top, bottom, 'carry_always_one'), 'Svaret matchar att minnessiffran alltid skrivs som 1, oavsett hur stor den är.'),
        prediction('mul_partials_concatenated', mulRows(top, bottom, 'partials_concatenated'), 'Svaret matchar att varje siffras produkt skrivs efter varandra i varje delprodukt.'),
        prediction('mul_no_row_shift', mulRows(top, bottom, 'no_row_shift'), 'Svaret matchar att den andra delprodukten inte flyttas ett steg åt vänster.'))
    }
    if (a >= 10 && b >= 10 && b <= 99) predictions.push(prediction('mul_columnwise', mulColumnwise(a, b), 'Svaret matchar att bara siffror i samma kolumn multipliceras, som vid addition.'))
  }
  if (op === 'division' && Number.isSafeInteger(a) && Number.isSafeInteger(b) && a >= 10 && b >= 2 && b <= 9 && a % b === 0) {
    predictions.push(prediction('div_remainder_ignored', divRemainderIgnored(a, b), 'Svaret matchar kort division där resten inte förs vidare till nästa siffra.'),
      prediction('div_remainder_as_ones', divRemainderAsOnes(a, b), 'Svaret matchar att resten läggs till som ental i stället för som tiotal.'))
    for (const dropped of divZeroDropped(a / b)) predictions.push(prediction('div_zero_dropped', dropped, 'Svaret matchar att nollan i kvoten har fallit bort.'))
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
