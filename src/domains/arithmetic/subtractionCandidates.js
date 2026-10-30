// Candidate calculations only. No diagnosis, profile update, network or AI call.
import { digitByDigitAbsDiff } from './errorHypotheses/commonHypotheses.js'
import { predictNoBorrowAnswer } from './errorHypotheses/subtractionHypotheses.js'

export const SUBTRACTION_MODEL_VERSION = 'subtraction-candidates-v1'
export const ZERO_EXCHANGE_MODELS = ['zero_donor_not_decremented', 'zero_intermediate_ten']

function integerAnswer(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null
  if (typeof value !== 'string' || !/^[+-]?\d+(?:[.,]0+)?$/.test(value.trim())) return null
  const parsed = Number(value.trim().replace(',', '.'))
  return Number.isSafeInteger(parsed) ? parsed : null
}

export function subtractionCandidates({ operation = 'subtraction', a, b, studentAnswer } = {}) {
  const base = { ruleVersion: SUBTRACTION_MODEL_VERSION, coverageIds: ['M02'], ncmArea: 'AS2',
    limitation: 'answer_model_match_not_proof_of_method', predictions: [], matches: [] }
  if (operation !== 'subtraction' || !Number.isSafeInteger(a) || !Number.isSafeInteger(b)
    || a < 0 || b < 0 || a < b) return { ...base, status: 'not_applicable' }
  const correct = a - b, answer = integerAnswer(studentAnswer)
  const predictions = []
  const add = (modelId, predictedAnswer, reasonSv, representation = null) => {
    // A non-discriminating example cannot corroborate or rule out a model.
    if (predictedAnswer !== correct) predictions.push({ modelId, predictedAnswer, reasonSv, representation })
  }
  add('smaller_minus_larger', digitByDigitAbsDiff(a, b), 'Svaret kan produceras av större siffra minus mindre i varje kolumn.')
  add('borrow_forget', predictNoBorrowAnswer(a, b), 'Svaret kan produceras genom noll i kolumner där växling behövs.')

  // Narrow, explicit scope: a three-digit minuend, one inner zero, and a
  // required exchange from hundreds through tens into units. No decimals,
  // consecutive zeros, negatives or general +100/+10 classification.
  const hundreds = Math.floor(a / 100), tens = Math.floor(a / 10) % 10, units = a % 10
  if (a >= 100 && a <= 999 && tens === 0 && units < b % 10) {
    const wrongDonor = { hundreds, tens: 9, units: units + 10 }
    const wrongIntermediate = { hundreds: hundreds - 1, tens: 10, units: units + 10 }
    const value = r => r.hundreds * 100 + r.tens * 10 + r.units
    add('zero_donor_not_decremented', value(wrongDonor) - b,
      'Svaret matchar en växlingskedja där det givande hundratalet inte minskas.', wrongDonor)
    add('zero_intermediate_ten', value(wrongIntermediate) - b,
      'Svaret matchar att tio tiotal behålls efter att ett har växlats till ental.', wrongIntermediate)
  }
  const matches = answer === null || answer === correct ? [] : predictions.filter(p => p.predictedAnswer === answer)
  return { ...base, correct, answer, delta: answer === null ? null : answer - correct, predictions, matches,
    status: answer === null ? 'uninterpretable' : answer === correct ? 'correct' : matches.length ? 'matched' : 'unmatched' }
}
