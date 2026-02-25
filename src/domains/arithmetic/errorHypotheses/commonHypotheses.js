/**
 * Gemensamma feltesther som kan träffa vilket räknesätt som helst.
 * Varje funktion testar om ett specifikt felmönster förklarar elevens svar.
 * Jämförelsetröskel 0.5 täcker heltalssvar med avrundning.
 */

const SNAP = 0.5

export function near(value, target) {
  return Math.abs(value - target) < SNAP
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
  if (correct === 0 || answer === 0) return false
  const ratio = answer / correct
  return near(ratio, 10) || near(ratio, 0.1) || near(ratio, 100) || near(ratio, 0.01)
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
