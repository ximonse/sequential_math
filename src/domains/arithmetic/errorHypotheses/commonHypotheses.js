/**
 * Gemensamma feltesther som kan träffa vilket räknesätt som helst.
 * Varje funktion testar om ett specifikt felmönster förklarar elevens svar.
 * Jämförelsen är exakt. Undantag: ett heltal mot ett icke-heltal godtas inom
 * 0.5, så att ett avrundat heltalssvar fortfarande kan matcha.
 */

const ROUNDING_SNAP = 0.5

export function nearExact(value, target) {
  return Math.abs(value - target) <= 1e-9 * Math.max(1, Math.abs(target))
}

export function near(value, target) {
  if (Number.isInteger(value) && !Number.isInteger(target)) return Math.abs(value - target) < ROUNDING_SNAP
  return nearExact(value, target)
}

export const PLACE_VALUE_FACTORS = [10, 100, 0.1, 0.01]

// Exact scaling only: 850 for 85 is a place-value shift, 830 is not.
export function isPlaceValueScaling(correct, answer) {
  if (correct === 0 || answer === 0) return false
  return PLACE_VALUE_FACTORS.some(factor => nearExact(answer, correct * factor))
}

/**
 * Siffrorna i svaret är bakvänt skrivna: 85 → 58, 123 → 321.
 * Vanlig ouppmärksamhetsvariant vid räkning med papper.
 */
export function testDigitReversal(correct, answer) {
  if (!Number.isInteger(correct) || correct < 10) return false
  if (near(correct, answer)) return false
  const reversed = parseInt(String(correct).split('').reverse().join(''), 10)
  return reversed !== correct && near(answer, reversed)
}

/**
 * Svaret är korrekt *sort av* men skalat med 10, 100, 0.1 eller 0.01.
 * Signal: eleven behöver tiopotenser och talvärde.
 */
export function testPlaceValueShift(correct, answer) {
  return isPlaceValueScaling(correct, answer)
}

/**
 * Svaret är bara första siffran i ett flersiffrigt facit (9 + 9 → 1).
 * Eleven skriver vänster till höger, så ett avbrutet svar blir första siffran.
 * Det är en inmatningssignal, inte ett räknefel.
 */
export function isLeadingDigitOnly(correct, answer) {
  return Number.isInteger(correct) && correct >= 10 && Number.isInteger(answer)
    && answer === Number(String(correct)[0])
}

export const PARTIAL_ENTRY_ANALYSIS = {
  category: 'inattention',
  patterns: ['partial_answer_entry'],
  detail: 'Svaret är bara första siffran i facit — troligen avbruten inmatning, inte ett räknefel.'
}

/**
 * Returnerar vad eleven borde ha fått om de tillämpat fel räknesätt.
 * Används för operation_swap-diagnos.
 */
export function getSwapAnswer(type, a, b) {
  if (type === 'addition')       return Math.abs(a - b)
  if (type === 'subtraction')    return a + b
  if (type === 'multiplication') return a + b
  if (type === 'division')       return a * b
  return null
}

/**
 * Digitvis summering utan minnessiffra-propagering.
 * (8+7=15 → skriver 5, bär inte 1 vidare till tiotal)
 */
export function digitByDigitSum(a, b) {
  let result = 0
  let pow = 1
  let ta = Math.abs(Math.round(a))
  let tb = Math.abs(Math.round(b))
  while (ta > 0 || tb > 0) {
    result += ((ta % 10 + tb % 10) % 10) * pow
    ta = Math.floor(ta / 10)
    tb = Math.floor(tb / 10)
    pow *= 10
  }
  return result
}

/**
 * Digitvis absolutbelopp-differens: |a_i - b_i| per position.
 * Producerar vad eleven får om de alltid subtraherar det mindre från det större.
 */
export function digitByDigitAbsDiff(a, b) {
  let result = 0
  let pow = 1
  let ta = Math.abs(Math.round(a))
  let tb = Math.abs(Math.round(b))
  while (ta > 0 || tb > 0) {
    result += Math.abs((ta % 10) - (tb % 10)) * pow
    ta = Math.floor(ta / 10)
    tb = Math.floor(tb / 10)
    pow *= 10
  }
  return result
}
