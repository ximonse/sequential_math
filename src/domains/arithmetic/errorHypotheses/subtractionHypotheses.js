/**
 * Feltestfunktioner specifika för subtraktion.
 * Returnerar ett ErrorAnalysis-objekt vid träff, annars null.
 */

import { digitByDigitAbsDiff, near } from './commonHypotheses'

/**
 * MISSUPPFATTNING: eleven subtraherar alltid det mindre talet från det större,
 * kolumn för kolumn, oavsett vilken term som är störst.
 * Ex: 52−38: etalkol → |2−8|=6, tiotalskol → |5−3|=2 → svar 26 (korrekt: 14).
 *
 * Det här är en inlärd felregel, inte slarv. Eleven är konsekvent — men fel.
 * Kräver riktad förklaring av låneprincipen, inte mer övning på subtraktion i allmänhet.
 */
export function testSmallerMinusLarger(a, b, correct, borrowCount, answer) {
  if (borrowCount === 0) return null
  const wrong = digitByDigitAbsDiff(a, b)
  if (near(wrong, correct) || !near(answer, wrong)) return null
  return {
    category: 'misconception',
    patterns: ['smaller_minus_larger'],
    detail: 'Subtraherar alltid det mindre från det större siffra för siffra — låning uteblir systematiskt.'
  }
}

/**
 * Eleven skriver 0 i kolumner där övre siffran är mindre än den undre,
 * och lånar inte. Subtraherar normalt i övriga kolumner.
 * Ex: 52−38: etalkol → 0 (kan inte göra 2−8), tiotalskol → 5−3=2 → svar 20.
 */
export function testBorrowForget(a, b, correct, borrowCount, answer) {
  if (borrowCount === 0) return null
  let wrong = 0
  let pow = 1
  let ta = Math.round(a)
  let tb = Math.round(b)
  while (ta > 0 || tb > 0) {
    const da = ta % 10
    const db = tb % 10
    wrong += (da >= db ? da - db : 0) * pow
    ta = Math.floor(ta / 10)
    tb = Math.floor(tb / 10)
    pow *= 10
  }
  if (near(wrong, correct) || !near(answer, wrong)) return null
  return {
    category: 'knowledge',
    patterns: ['borrow_forget'],
    detail: 'Skriver 0 när övre siffran är mindre — låning tillämpas inte.'
  }
}
