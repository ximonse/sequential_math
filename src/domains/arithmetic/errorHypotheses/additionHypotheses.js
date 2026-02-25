/**
 * Feltestfunktioner specifika för addition.
 * Returnerar ett ErrorAnalysis-objekt vid träff, annars null.
 */

import { digitByDigitSum, near } from './commonHypotheses'

/**
 * Eleven adderade varje kolumn utan att bära minnessiffra vidare.
 * Ex: 38+47 → skriver 5 i entalskol (7+8=15 → 5) men lägger inte 1 på tiotalen → 75 istf 85.
 * Testmetod: digitvis summa utan överföring = korrekt svar minus alla minnessiffrors bidrag.
 */
export function testCarryForget(a, b, correct, carryCount, answer) {
  if (carryCount === 0) return null
  const wrong = digitByDigitSum(a, b)
  if (near(wrong, correct) || !near(answer, wrong)) return null
  return {
    category: 'knowledge',
    patterns: ['carry_forget'],
    detail: 'Tiotalsövergång förbises — varje kolumn adderas isolerat utan minnessiffra.'
  }
}

/**
 * Eleven räknar minnessiffran dubbelt — lägger till den både i kolumnen och i nästa.
 * Ex: 38+47=85, eleven får 95 (bar 1 extra gång i tiotalskolumnen).
 * Testmetod: korrekt svar + 10 per minnessiffra.
 */
export function testCarryDouble(correct, carryCount, answer) {
  if (carryCount === 0) return null
  const wrong = correct + 10 * carryCount
  if (near(wrong, correct) || !near(answer, wrong)) return null
  return {
    category: 'knowledge',
    patterns: ['carry_double'],
    detail: 'Minnessiffra verkar ha lagts till dubbelt i nästa kolumn.'
  }
}

/**
 * Eleven skriver bara etalssiffran av summan, ignorerar tiotal.
 * Ex: 38+47=85, eleven svarar 5 (85%10=5).
 */
export function testOnesDigitOnly(correct, answer) {
  const wrong = correct % 10
  if (wrong === correct || !near(answer, wrong)) return null
  return {
    category: 'knowledge',
    patterns: ['ones_digit_only'],
    detail: 'Endast entalssiffran i summan skrevs — tiotalssiffran saknas.'
  }
}
