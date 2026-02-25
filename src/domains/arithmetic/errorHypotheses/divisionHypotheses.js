/**
 * Feltestfunktioner specifika för division.
 * Returnerar ett ErrorAnalysis-objekt vid träff, annars null.
 */

import { near } from './commonHypotheses'

/**
 * Eleven svarar en för lite eller för mycket.
 * Ex: 24÷6=4, eleven svarar 3 eller 5.
 * Signal: eleven hittar ungefär rätt i tabellen men är osäker på exakt faktum.
 */
export function testQuotientOffByOne(correct, answer) {
  if (near(answer, correct - 1) && !near(correct - 1, correct)) {
    return {
      category: 'knowledge',
      patterns: ['quotient_off_by_one'],
      detail: 'Kvoten är ett steg för liten — nästan rätt i tabellen.'
    }
  }
  if (near(answer, correct + 1) && !near(correct + 1, correct)) {
    return {
      category: 'knowledge',
      patterns: ['quotient_off_by_one'],
      detail: 'Kvoten är ett steg för stor — nästan rätt i tabellen.'
    }
  }
  return null
}

/**
 * MISSUPPFATTNING: eleven dividerade täljare och nämnare i omvänd ordning (b÷a istf a÷b).
 * Ex: 8÷24 istf 24÷8. Ger ett heltal om b är delbart med a.
 * Signal: eleven har inte befäst vilket tal som delas och vilket som delar.
 */
export function testReversedOperands(a, b, correct, answer) {
  if (a === 0) return null
  const reversed = b / a
  if (!Number.isFinite(reversed) || near(reversed, correct)) return null
  if (!near(answer, reversed)) return null
  return {
    category: 'misconception',
    patterns: ['reversed_operands'],
    detail: 'Delade i omvänd ordning — täljare och nämnare förväxlades.'
  }
}

/**
 * Eleven svarade med divisorn (b) istf kvoten.
 * Ex: 24÷6=4, eleven svarar 6.
 * Signal: eleven är osäker på vad frågan ber om.
 */
export function testDivisorAsAnswer(b, correct, answer) {
  if (near(b, correct)) return null
  if (!near(answer, b)) return null
  return {
    category: 'knowledge',
    patterns: ['divisor_as_answer'],
    detail: 'Svarade med divisorn — möjlig förvirring om rollerna i divisionen.'
  }
}

/**
 * Eleven svarade med dividenden (a) istf kvoten.
 * Ex: 24÷6=4, eleven svarar 24.
 */
export function testDividendAsAnswer(a, correct, answer) {
  if (near(a, correct)) return null
  if (!near(answer, a)) return null
  return {
    category: 'knowledge',
    patterns: ['dividend_as_answer'],
    detail: 'Svarade med dividenden — möjlig förvirring om vad som ska beräknas.'
  }
}
