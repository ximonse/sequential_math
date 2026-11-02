import { describe, expect, it } from 'vitest'
import manifest from '../arithmetic/diagnosticTasks.v1.json'
import { predictableCandidates } from './index.js'

const p = (type, a, b) => ({ domain: 'arithmetic', type, skill: type, values: { a, b } })
const ids = (type, a, b, answer) => predictableCandidates(p(type, a, b), answer).matches.map(m => m.modelId)

// Step 4 of docs/VALIDATION_PLAN.md: written multiplication and short division.
describe('written multiplication and division error models', () => {
  it('recognises the multiplication rules', () => {
    expect(ids('multiplication', 46, 7, 282)).toContain('mul_carry_forgotten')
    expect(ids('multiplication', 46, 7, 562)).toContain('mul_carry_added_before')
    expect(ids('multiplication', 46, 7, 2842)).toContain('mul_partials_concatenated')
    expect(ids('multiplication', 46, 7, 82)).toContain('mul_columnwise')
    expect(ids('multiplication', 34, 23, 170)).toContain('mul_no_row_shift')
    expect(ids('multiplication', 34, 23, 772)).toContain('mul_carry_forgotten')
  })

  it('recognises the short division rules', () => {
    expect(ids('division', 168, 6, 21)).toContain('div_remainder_ignored')
    expect(ids('division', 168, 6, 22)).toContain('div_remainder_as_ones')
    expect(ids('division', 648, 6, 18)).toContain('div_zero_dropped')
    expect(ids('division', 168, 6, 27)).toContain('quotient_off_by_one')
  })

  it('leaves table facts and inexact division alone', () => {
    expect(ids('multiplication', 7, 8, 55)).not.toContain('mul_carry_forgotten')
    expect(predictableCandidates(p('division', 50, 3), 16).matches.map(m => m.modelId)).not.toContain('div_remainder_ignored')
  })

  it('keeps every new bank task able to separate the written rules from each other and from the answer', () => {
    for (const task of manifest.tasks.filter(t => /^(mul|div)-/u.test(t.taskId))) {
      const r = predictableCandidates(p(task.operation, task.operands[0], task.operands[1]), '')
      const family = task.operation === 'multiplication'
        ? ['mul_carry_forgotten', 'mul_carry_added_before', 'mul_columnwise']
        : ['div_remainder_ignored', 'div_remainder_as_ones']
      const values = [r.computedCorrect, ...family.map(id => r.predictions.find(x => x.modelId === id)?.predictedAnswer)]
      expect(values.every(v => v !== undefined), task.taskId).toBe(true)
      expect(new Set(values).size, task.taskId).toBe(values.length)
    }
  })
})
