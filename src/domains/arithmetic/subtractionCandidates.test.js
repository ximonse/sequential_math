import { describe, expect, it } from 'vitest'
import { subtractionCandidates } from './subtractionCandidates.js'
import { decidePilot } from '../../../scripts/prototypes/ncm-screening-pilot.mjs'
import { reviewedHistory, response } from '../../../scripts/prototypes/ncm-screening-pilot.fixtures.mjs'

describe('predictable subtraction model candidates', () => {
  for (const [a, b, correct, donor, intermediate] of [
    [402, 178, 224, 324, 234], [503, 267, 236, 336, 246], [804, 376, 428, 528, 438],
    [906, 458, 448, 548, 458], [702, 385, 317, 417, 327], [602, 275, 327, 427, 337],
  ]) it(`${a} − ${b}: derives both incorrect representations rather than classifying any delta`, () => {
    const first = subtractionCandidates({ a, b, studentAnswer: donor })
    expect(first.correct).toBe(correct)
    expect(first.matches.map(m => m.modelId)).toContain('zero_donor_not_decremented')
    expect(first.matches.find(m => m.modelId === 'zero_donor_not_decremented').representation.hundreds).toBe(Math.floor(a / 100))
    expect(subtractionCandidates({ a, b, studentAnswer: intermediate }).matches.map(m => m.modelId)).toContain('zero_intermediate_ten')
    expect(subtractionCandidates({ a, b, studentAnswer: correct }).matches).toEqual([])
  })
  it('reuses both existing subtraction models', () => {
    expect(subtractionCandidates({ a: 402, b: 178, studentAnswer: 376 }).matches.map(m => m.modelId)).toContain('smaller_minus_larger')
    expect(subtractionCandidates({ a: 402, b: 178, studentAnswer: 300 }).matches.map(m => m.modelId)).toContain('borrow_forget')
  })
  it('does not assign the zero-exchange model to a +100 error outside its scope', () => {
    for (const [a, b] of [[642, 217], [402, 171], [1002, 178], [52, 18]]) {
      const result = subtractionCandidates({ a, b, studentAnswer: a - b + 100 })
      expect(result.predictions.some(m => m.modelId.startsWith('zero_'))).toBe(false)
    }
    expect(subtractionCandidates({ a: 402, b: 178, studentAnswer: 225 }).matches).toEqual([])
  })
  it('guards negatives, decimals, unsafe operands and other operations', () => {
    for (const args of [{ a: 4.02, b: 1.78 }, { a: -402, b: 178 }, { a: 178, b: 402 },
      { a: Infinity, b: 1 }, { a: Number.MAX_SAFE_INTEGER + 1, b: 1 }, { operation: 'addition', a: 402, b: 178 }]) {
      expect(subtractionCandidates({ ...args, studentAnswer: 324 }).status).toBe('not_applicable')
    }
  })
  it('does not round decimal or empty input into a known wrong answer', () => {
    for (const answer of ['', ' ', '324.2', null, NaN, '3x']) expect(subtractionCandidates({ a: 402, b: 178, studentAnswer: answer }).status).toBe('uninterpretable')
    expect(subtractionCandidates({ a: 402, b: 178, studentAnswer: '324,0' }).status).toBe('matched')
  })
  it('preserves all matching candidates when different rules produce the same answer', () => {
    // 100−5 = 95: per-column subtraction and ten retained tens both give 105.
    const result = subtractionCandidates({ a: 100, b: 5, studentAnswer: 105 })
    expect(result.matches.map(m => m.modelId).sort()).toEqual(['smaller_minus_larger', 'zero_intermediate_ten'])
    expect(result.limitation).toBe('answer_model_match_not_proof_of_method')
  })
  it('routes a known zero-exchange candidate to an unused contrast without an AI call', () => {
    const history = [reviewedHistory('sub-through-zero-001', 324)]
    const result = decidePilot({ scope: 'through_zero', history })
    expect(result).toMatchObject({ action: 'ask', task: { id: 'sub-through-zero-002' }, reasonCode: 'contrast_zero_exchange_model' })
    expect(result.modelEvidence[0]).toMatchObject({ evidenceId: history[0].id, snapshotRevision: history[0].snapshotRevision })
    const review = decidePilot({ scope: 'through_zero', history, responses: [response('sub-through-zero-002', 336)] })
    expect(review).toMatchObject({ action: 'stop', outcome: 'needs_review', reasonCode: 'zero_exchange_model_review' })
    expect(review.modelEvidence).toHaveLength(2)
  })
  it('never bypasses saving or method conflicts even when a predictable model matches', () => {
    expect(decidePilot({ scope: 'through_zero', responses: [response('sub-through-zero-001', 324, { saved: false })] }).action).toBe('wait')
    expect(decidePilot({ scope: 'through_zero', responses: [response('sub-through-zero-001', 324, { method: 'contradictory' })] }).reasonCode).toBe('method_conflict')
  })
})
