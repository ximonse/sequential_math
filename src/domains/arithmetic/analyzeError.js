/**
 * Felanalys för aritmetik.
 *
 * Princip: för varje hypotes beräknar vi vilket svar eleven BORDE ha fått
 * om den specifika felmodellen stämmer, och jämför med faktiskt svar.
 * Det är annorlunda mot att bara titta på uppgiftens egenskaper.
 *
 * Ordning: inattention → misconception → knowledge → fallback.
 * Returnerar vid första träff.
 */

import { evaluateArithmeticProblem } from './evaluate'
import { countBorrows, countCarries } from '../../lib/problemGeneratorMathHelpers'
import {
  getSwapAnswer,
  isLeadingDigitOnly,
  near,
  nearExact,
  PARTIAL_ENTRY_ANALYSIS,
  testDigitReversal,
  testPlaceValueShift
} from './errorHypotheses/commonHypotheses'
import {
  testCarryDouble,
  testCarryForget,
  testOnesDigitOnly
} from './errorHypotheses/additionHypotheses'
import {
  testBorrowForget,
  testSmallerMinusLarger
} from './errorHypotheses/subtractionHypotheses'
import {
  testDecimalPartsSeparately,
  testOnesDigitsOnly,
  testPlaceValueMisconception,
  testTableOffByOne
} from './errorHypotheses/multiplicationHypotheses'
import {
  testDividendAsAnswer,
  testDivisorAsAnswer,
  testQuotientOffByOne,
  testReversedOperands
} from './errorHypotheses/divisionHypotheses'

function extractValues(problem) {
  return {
    a:           Number(problem?.values?.a),
    b:           Number(problem?.values?.b),
    type:        String(problem?.type || ''),
    correct:     Number(problem?.answer?.correct ?? problem?.result),
    carryCount:  Number(problem?.metadata?.carryCount  || 0),
    borrowCount: Number(problem?.metadata?.borrowCount || 0)
  }
}

function decimalPlaces(value) {
  const text = String(value)
  if (/e/i.test(text)) return Infinity
  return text.split('.')[1]?.length ?? 0
}

// Column models work on place-aligned, non-negative digits. Decimals are scaled
// to whole columns (3,48 + 2,67 → 348 + 267) and the prediction scaled back.
function columnFrame(type, a, b, correct, answer, carryCount, borrowCount) {
  if (a < 0 || b < 0 || (type === 'subtraction' && a < b)) return null
  const places = Math.max(decimalPlaces(a), decimalPlaces(b))
  if (places > 3) return null
  const scale = 10 ** places
  return {
    scale,
    a: Math.round(a * scale), b: Math.round(b * scale),
    correct: Math.round(correct * scale), answer: answer * scale,
    // Count from the operands instead of relying on optional problem metadata.
    carryCount: type === 'addition' ? countCarries(a, b) : carryCount,
    borrowCount: type === 'subtraction' ? countBorrows(a, b) : borrowCount
  }
}

function analyzeAddition(a, b, correct, answer, carryCount, scale) {
  return (
    testCarryForget(a, b, correct, carryCount, answer) ||
    testCarryDouble(correct, carryCount, answer) ||
    (scale === 1 ? testOnesDigitOnly(correct, answer) : null)
  )
}

function analyzeSubtraction(a, b, correct, answer, borrowCount) {
  return (
    testSmallerMinusLarger(a, b, correct, borrowCount, answer) ||
    testBorrowForget(a, b, correct, borrowCount, answer)
  )
}

function analyzeMultiplication(a, b, correct, answer) {
  if (testPlaceValueMisconception(correct, answer)) {
    return {
      category: 'misconception',
      patterns: ['place_value_error'],
      detail: 'Svaret är korrekt beräknat men skalat fel — troligt talvärdesproblem vid multiplikation.'
    }
  }
  return (
    testDecimalPartsSeparately(a, b, correct, answer) ||
    testTableOffByOne(a, b, correct, answer) ||
    testOnesDigitsOnly(a, b, correct, answer)
  )
}

function analyzeDivision(a, b, correct, answer) {
  return (
    testReversedOperands(a, b, correct, answer) ||
    testQuotientOffByOne(correct, answer) ||
    testDivisorAsAnswer(b, correct, answer) ||
    testDividendAsAnswer(a, correct, answer)
  )
}

export function analyzeArithmeticError(problem, studentAnswer) {
  const evaluation = evaluateArithmeticProblem(problem, studentAnswer)
  if (evaluation.correct) {
    return { category: 'none', patterns: [], detail: '' }
  }

  const { a, b, type, correct, carryCount, borrowCount } = extractValues(problem)
  const answer = Number(studentAnswer)

  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(correct) || !Number.isFinite(answer)) {
    return { category: 'knowledge', patterns: ['calculation_error'], detail: 'Fel svar.' }
  }

  // 1. Fel räknesätt tillämpat (ouppmärksamhet)
  // Rounding tolerance is for integer tasks with a non-integer quotient, not decimal operands.
  const matches = Number.isInteger(a) && Number.isInteger(b) ? near : nearExact
  const swapAnswer = getSwapAnswer(type, a, b)
  if (swapAnswer !== null && !matches(swapAnswer, correct) && matches(answer, swapAnswer)) {
    return {
      category: 'inattention',
      patterns: ['operation_swap'],
      detail: 'Svaret matchar vad fel räknesätt skulle ge — troligt ouppmärksamhetsfel.'
    }
  }

  // 2. Siffrorna i svaret är bakvänt (ouppmärksamhet)
  if (testDigitReversal(correct, answer)) {
    return {
      category: 'inattention',
      patterns: ['digit_reversal'],
      detail: 'Siffrorna i svaret verkar skrivna i omvänd ordning.'
    }
  }

  // 2b. Bara första siffran av facit (avbruten inmatning)
  if (isLeadingDigitOnly(correct, answer)) return { ...PARTIAL_ENTRY_ANALYSIS }

  // 3. Talvärdesförskjutning ×10 / ÷10 (missuppfattning, gemensam för alla räknesätt)
  if (type !== 'multiplication' && testPlaceValueShift(correct, answer)) {
    return {
      category: 'misconception',
      patterns: ['place_value_error'],
      detail: 'Svaret är korrekt storlek men skalat med faktor 10 eller 100 — troligt talvärdesproblem.'
    }
  }

  // 4. Räknesättsspecifik analys
  const column = ['addition', 'subtraction'].includes(type)
    ? columnFrame(type, a, b, correct, answer, carryCount, borrowCount)
    : null
  const operationResult =
    type === 'addition'       ? column && analyzeAddition(column.a, column.b, column.correct, column.answer, column.carryCount, column.scale) :
    type === 'subtraction'    ? column && analyzeSubtraction(column.a, column.b, column.correct, column.answer, column.borrowCount) :
    type === 'multiplication' ? analyzeMultiplication(a, b, correct, answer) :
    type === 'division'       ? analyzeDivision(a, b, correct, answer) :
    null

  if (operationResult) return operationResult

  // 5. Okänt mönster
  return {
    category: 'knowledge',
    patterns: ['calculation_error'],
    detail: 'Fel svar utan identifierat mönster.'
  }
}
