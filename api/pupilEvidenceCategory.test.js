import { describe, expect, it } from 'vitest'
import { practiceEvidence } from './_pupilEvidence.js'

// The pupil app stores 'misconception' (e.g. smaller-minus-larger); the evidence
// and export must not turn it into 'unknown' (found in the production test class).
describe('evidence keeps the stored error category', () => {
  it('passes misconception and input through and keeps unknown for anything else', () => {
    const base = { timestamp: 1, values: { a: 52, b: 38 }, correct: false, studentAnswer: 26, correctAnswer: 14 }
    const profile = { problemLog: [
      { ...base, observationId: 'A', errorCategory: 'misconception' },
      { ...base, observationId: 'B', errorCategory: 'input' },
      { ...base, observationId: 'C', errorCategory: 'something_else' }] }
    expect(practiceEvidence(profile).entries.map(e => e.interpretation.category)).toEqual(['misconception', 'input', 'unknown'])
  })
})
