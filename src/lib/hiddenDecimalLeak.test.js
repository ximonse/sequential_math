import { describe, expect, it } from 'vitest'
import { generateByDifficultyWithOptions } from './problemGenerator'

// Simon 2026-11-01: hidden decimal tasks are chosen only by hiddenDecimalPolicy
// (25 %, 50 % when behind). The ordinary rotation must not add more.
describe('hidden decimal evidence in ordinary addition and subtraction', () => {
  for (const level of [4, 5, 7, 8, 10, 12]) {
    it(`gives no decimal task without the evidence request at level ${level}`, () => {
      for (let i = 0; i < 40; i++) {
        const problem = generateByDifficultyWithOptions(level, { allowedTypes: ['subtraction'] })
        expect(problem.template, problem.template).not.toContain('_dec_')
        expect(problem.metadata?.evidenceSkill ?? '').not.toBe('positions_decimal')
      }
    })
  }

  it('still gives a decimal task when the policy asks for one', () => {
    const problem = generateByDifficultyWithOptions(5, { allowedTypes: ['subtraction'], evidenceSkill: 'positions_decimal' })
    expect(problem.metadata.evidenceSkill).toBe('positions_decimal')
  })
})
