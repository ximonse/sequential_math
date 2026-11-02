/**
 * Feltestfunktioner specifika för subtraktion.
 * Returnerar ett ErrorAnalysis-objekt vid träff, annars null.
 */

import { digitByDigitAbsDiff, near } from './commonHypotheses.js'

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
  const wrong = predictNoBorrowAnswer(a, b)
  if (near(wrong, correct) || !near(answer, wrong)) return null
  return {
    category: 'knowledge',
    patterns: ['borrow_forget'],
    detail: 'Skriver 0 när övre siffran är mindre — låning tillämpas inte.'
  }
}

// Rule engine only (not the pupil app labels): the pupil exchanges in a column
// (top + 10 − bottom) but never decreases the column it exchanged from.
// Gives the same digit as smaller-minus-larger when the units differ by 5.
export function predictExchangeNotDecremented(a, b) {
  let wrong = 0
  let pow = 1
  let ta = Math.round(a)
  let tb = Math.round(b)
  while (ta > 0 || tb > 0) {
    const da = ta % 10
    const db = tb % 10
    wrong += (da >= db ? da - db : da + 10 - db) * pow
    ta = Math.floor(ta / 10)
    tb = Math.floor(tb / 10)
    pow *= 10
  }
  return wrong
}

// Rule engine only (blind test 2): the first exchange is done correctly, borrowing
// past zeros from the next non-zero column (zeros stay 0); every later column that
// needs an exchange is inverted, |top − bottom| (402 − 178 = 274, 621 − 384 = 377).
export function predictSecondExchangeInverted(a, b) {
  const top = String(Math.round(a)).split('').reverse().map(Number)
  const bottom = String(Math.round(b)).split('').reverse().map(Number)
  let exchanged = false
  let out = 0
  for (let i = 0; i < top.length; i++) {
    const t = top[i], d = bottom[i] ?? 0
    if (t >= d) { out += (t - d) * 10 ** i; continue }
    if (!exchanged) {
      let j = i + 1
      while (j < top.length && top[j] === 0) j++
      if (j >= top.length) return null
      top[j] -= 1
      exchanged = true
      out += (t + 10 - d) * 10 ** i
    } else out += (d - t) * 10 ** i
  }
  return out
}

// Shared calculation; preserve the legacy detector's behaviour.
export function predictNoBorrowAnswer(a, b) {
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
  return wrong
}
