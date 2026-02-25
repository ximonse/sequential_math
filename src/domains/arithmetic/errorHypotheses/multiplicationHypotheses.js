/**
 * Feltestfunktioner specifika för multiplikation.
 * Returnerar ett ErrorAnalysis-objekt vid träff, annars null.
 */

import { near } from './commonHypotheses'

/**
 * Eleven svarar på ett angränsande tabellvärde: a×(b±1) eller (a±1)×b.
 * Ex: 7×8=56 men eleven svarar 63 (=7×9) eller 49 (=7×7).
 * Signal: tabellkunskap finns men är inexakt — specifik faktadrillning hjälper.
 */
export function testTableOffByOne(a, b, correct, answer) {
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
  const wrong = (Math.round(a) % 10) * (Math.round(b) % 10)
  if (near(wrong, correct) || !near(answer, wrong)) return null
  return {
    category: 'knowledge',
    patterns: ['ones_digits_only'],
    detail: 'Multiplicerade enbart entalen, ignorerade tiotal och hundratal.'
  }
}

/**
 * MISSUPPFATTNING: talvärde vid multiplikation.
 * Eleven multiplicerar korrekt men placerar resultatet i fel tiopotens.
 * Ex: 3×4=12 men eleven svarar 120 — trolig förvirring om skalfaktor.
 * Testas via place_value_error i commonHypotheses — signaleras här som misconception.
 */
export function testPlaceValueMisconception(correct, answer) {
  if (correct === 0 || answer === 0) return false
  const ratio = answer / correct
  return (
    Math.abs(ratio - 10) < 0.5 ||
    Math.abs(ratio - 0.1) < 0.005 ||
    Math.abs(ratio - 100) < 0.5 ||
    Math.abs(ratio - 0.01) < 0.00005
  )
}
