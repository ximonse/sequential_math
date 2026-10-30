/**
 * Feltestfunktioner specifika för multiplikation.
 * Returnerar ett ErrorAnalysis-objekt vid träff, annars null.
 */

import { isPlaceValueScaling, near } from './commonHypotheses.js'

/**
 * Eleven svarar på ett angränsande tabellvärde: a×(b±1) eller (a±1)×b.
 * Ex: 7×8=56 men eleven svarar 63 (=7×9) eller 49 (=7×7).
 * Signal: tabellkunskap finns men är inexakt — specifik faktadrillning hjälper.
 */
export function testTableOffByOne(a, b, correct, answer) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null
  const neighbors = [
    a * (b - 1),
    a * (b + 1),
    (a - 1) * b,
    (a + 1) * b
  ]
  for (const wrong of neighbors) {
    if (wrong >= 0 && !near(wrong, correct) && near(answer, wrong)) {
      return {
        category: 'knowledge',
        patterns: ['table_off_by_one'],
        detail: 'Svarade på angränsande tabellvärde — tätt intill men fel faktum.'
      }
    }
  }
  return null
}

/**
 * Eleven multiplicerade bara entalen med varandra och ignorerade tiotal/hundratal.
 * Ex: 23×4: eleven räknar 3×4=12 och svarar 12 istf 92.
 */
export function testOnesDigitsOnly(a, b, correct, answer) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null
  const wrong = (Math.round(a) % 10) * (Math.round(b) % 10)
  if (near(wrong, correct) || !near(answer, wrong)) return null
  return {
    category: 'knowledge',
    patterns: ['ones_digits_only'],
    detail: 'Multiplicerade enbart entalen, ignorerade tiotal och hundratal.'
  }
}

/**
 * MISSUPPFATTNING: heltal och decimaldel multipliceras var för sig och skrivs ihop.
 * Ex: 7 × 6,7 → 7·6 = 42 och 7·7 = 49 → svar 42,49 (korrekt 46,9).
 * Gäller ett heltal gånger ett tal med en decimal.
 */
export function predictDecimalPartsSeparately(a, b) {
  const [whole, dec] = Number.isInteger(a) ? [a, b] : [b, a]
  if (!Number.isInteger(whole) || whole < 0) return null
  const parts = String(dec).split('.')
  if (parts.length !== 2 || parts[1].length !== 1 || Number(parts[0]) < 0) return null
  return Number(`${whole * Number(parts[0])}.${whole * Number(parts[1])}`)
}

export function testDecimalPartsSeparately(a, b, correct, answer) {
  const wrong = predictDecimalPartsSeparately(a, b)
  if (wrong === null || near(wrong, correct) || Math.abs(answer - wrong) > 1e-9) return null
  return {
    category: 'misconception',
    patterns: ['decimal_parts_multiplied_separately'],
    detail: 'Heltal och decimaldel verkar ha multiplicerats var för sig och skrivits ihop.'
  }
}

/**
 * MISSUPPFATTNING: talvärde vid multiplikation.
 * Eleven multiplicerar korrekt men placerar resultatet i fel tiopotens.
 * Ex: 3×4=12 men eleven svarar 120 — trolig förvirring om skalfaktor.
 * Testas via place_value_error i commonHypotheses — signaleras här som misconception.
 */
export function testPlaceValueMisconception(correct, answer) {
  return isPlaceValueScaling(correct, answer)
}
