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
import {
  getSwapAnswer,
  near,
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

function analyzeAddition(a, b, correct, answer, carryCount) {
  return (
    testCarryForget(a, b, correct, carryCount, answer) ||
    testCarryDouble(correct, carryCount, answer) ||
    testOnesDigitOnly(correct, answer)
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
  const swapAnswer = getSwapAnswer(type, a, b)
  if (swapAnswer !== null && !near(swapAnswer, correct) && near(answer, swapAnswer)) {
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

  // 3. Talvärdesförskjutning ×10 / ÷10 (missuppfattning, gemensam för alla räknesätt)
  if (type !== 'multiplication' && testPlaceValueShift(correct, answer)) {
    return {
      category: 'misconception',
      patterns: ['place_value_error'],
      detail: 'Svaret är korrekt storlek men skalat med faktor 10 eller 100 — troligt talvärdesproblem.'
    }
  }

  // 4. Räknesättsspecifik analys
  const operationResult =
    type === 'addition'       ? analyzeAddition(a, b, correct, answer, carryCount) :
    type === 'subtraction'    ? analyzeSubtraction(a, b, correct, answer, borrowCount) :
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
