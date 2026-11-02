import { describe, expect, it } from 'vitest'
import { predictableCandidates } from './index.js'
import { buildRuleHypotheses } from '../../lib/pupilRuleHypotheses.js'

const p = (type, a, b) => ({ domain: 'arithmetic', type, skill: type, values: { a, b } })
const ids = (type, a, b, answer) => predictableCandidates(p(type, a, b), answer).matches.map(m => m.modelId)

// Rule version v7: gaps found in blind test 3 (2026-11-02) and the left-to-right
// profile from blind test 2.
describe('rule version v7 models', () => {
  it('finds a missing row shift with either factor on top', () => {
    expect(ids('multiplication', 11, 90, 180)).toContain('mul_no_row_shift')
    expect(ids('multiplication', 32, 33, 165)).toContain('mul_no_row_shift')
    expect(ids('multiplication', 22, 41, 164)).toContain('mul_no_row_shift')
    expect(ids('multiplication', 34, 23, 170)).toContain('mul_no_row_shift')
  })

  it('finds a dropped quotient zero also when it is last', () => {
    expect(ids('division', 320, 4, 8)).toContain('div_zero_dropped')
    expect(ids('division', 60, 3, 2)).toContain('div_zero_dropped')
    expect(ids('division', 648, 6, 18)).toContain('div_zero_dropped')
  })

  it('finds a carry that is always written as 1', () => {
    expect(ids('multiplication', 46, 7, 292)).toContain('mul_carry_always_one')
    expect(ids('multiplication', 146, 4, 574)).toContain('mul_carry_always_one')
    expect(ids('multiplication', 19, 28, 472)).toContain('mul_carry_always_one')
    expect(ids('multiplication', 23, 4, 92)).toEqual([])
  })

  it('finds digit products written after each other in two-digit multiplication', () => {
    expect(ids('multiplication', 34, 23, 1592)).toContain('mul_partials_concatenated')
  })

  it('finds columns worked from the left', () => {
    expect(ids('addition', 283, 462, 646)).toContain('add_left_to_right')
    // Where left to right gives the same answer as a forgotten carry, only the carry is named.
    expect(ids('addition', 248, 327, 565)).toEqual(['carry_forget'])
    expect(ids('subtraction', 402, 178, 333)).toContain('sub_left_to_right')
    expect(ids('addition', 352, 426, 778)).toEqual([])
  })
})

const entry = (ref, problem, answer, status = 'incorrect') => ({ ref, source: 'screening', reference: { observationId: ref },
  answer: { status }, question: {}, context: {}, interpretation: { predictable: predictableCandidates(problem, answer) } })

describe('rule hypotheses in v7', () => {
  it('shows the specific rule, not generic scaling, for a dropped last zero', () => {
    const codes = buildRuleHypotheses([entry('a', p('division', 320, 4), 8)]).map(h => h.signalCode)
    expect(codes).toContain('div_zero_dropped')
    expect(codes).not.toContain('place_value_scaling')
  })

  it('treats a quotient one off as a slip until it repeats', () => {
    const two = [entry('a', p('division', 42, 3), 13), entry('b', p('division', 168, 6), 27)]
    expect(buildRuleHypotheses(two).map(h => h.signalCode)).not.toContain('quotient_off_by_one')
    const three = [...two, entry('c', p('division', 312, 6), 51)]
    expect(buildRuleHypotheses(three).map(h => h.signalCode)).toContain('quotient_off_by_one')
  })
})
