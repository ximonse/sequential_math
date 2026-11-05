import { describe, expect, it } from 'vitest'
import { arithmeticContentSignature } from './arithmeticContentSignature.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { comparableRuleCounter, buildRuleHypotheses } from './pupilRuleHypotheses.js'

const question = (a, b, operation = 'subtraction') => ({ domain: 'arithmetic', type: operation, values: { a, b } })
const screening = (a, b, answer, correct = a - b) => ({ ref: `${a}-${b}`, source: 'screening',
  question: { operation: 'subtraction', operands: [a, b] }, context: {},
  answer: { status: answer === correct ? 'correct' : 'incorrect', studentAnswer: answer, correctAnswer: correct } })
describe('actual screening content as possible counterevidence', () => {
  it('recognizes a later correct answer at the same through-zero structure without inventing a level', () => {
    const [support, later] = addPredictableEvidence([screening(402, 178, 376), screening(503, 267, 236)])
    expect(comparableRuleCounter(later, [support], 'smaller_minus_larger')).toBe(true)
    expect(later.context).not.toHaveProperty('contentLevel')
  })
  it('rejects different content, a non-discriminating correct answer and conflicting known levels', () => {
    const [support, shorter, noExchange, aligned] = addPredictableEvidence([
      screening(402, 178, 376), screening(62, 27, 35), screening(864, 321, 543), screening(503, 267, 236)])
    expect(comparableRuleCounter(shorter, [support], 'smaller_minus_larger')).toBe(false)
    expect(comparableRuleCounter(noExchange, [support], 'smaller_minus_larger')).toBe(false)
    support.context = { contentSkill: 'subtraction', contentLevel: 5 }
    aligned.context = { contentSkill: 'subtraction', contentLevel: 4 }
    expect(comparableRuleCounter(aligned, [support], 'smaller_minus_larger')).toBe(false)
    expect(comparableRuleCounter(aligned, [support], 'invented')).toBe(false)
  })
  it('keeps practice and later screening evidence together without assigning a screening level', () => {
    const practice = { ...screening(402, 178, 376), source: 'practice', reference: { observationId: 'PRACTICE' },
      context: { contentSkill: 'subtraction', contentLevel: 5 } }
    const later = { ...screening(503, 267, 236), reference: { attemptId: 'SCREENING' } }
    const entries = addPredictableEvidence([practice, later])
    const hypothesis = buildRuleHypotheses(entries).find(item => item.signalCode === 'smaller_minus_larger')
    expect(hypothesis.supportRefs).toEqual([practice.ref])
    expect(hypothesis.counterRefs).toEqual([later.ref])
    expect(entries[1].context).toEqual({})
  })
  it('compares operation and exchange structure and leaves unsupported inputs unknown', () => {
    expect(arithmeticContentSignature(question(402, 178))).toBe(arithmeticContentSignature(question(503, 267)))
    expect(arithmeticContentSignature(question(503, 267))).not.toBe(arithmeticContentSignature(question(563, 267)))
    for (const problem of [question(3.2, 1.7), question(-20, 4), question(12, 0, 'division'), { domain: 'fractions' }]) {
      expect(arithmeticContentSignature(problem)).toBeNull()
    }
    expect(arithmeticContentSignature(question(357, 268, 'addition'))).not.toBe(arithmeticContentSignature(question(123, 456, 'addition')))
    expect(arithmeticContentSignature(question(320, 4, 'division'))).not.toBe(arithmeticContentSignature(question(328, 4, 'division')))
  })
})
