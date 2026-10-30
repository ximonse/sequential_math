import { describe, expect, it } from 'vitest'
import { analyzeArithmeticError } from './analyzeError'

const problem = (type, a, b, correct, metadata) =>
  ({ type, values: { a, b }, result: correct, answer: { type: 'number', correct }, ...(metadata ? { metadata } : {}) })
const patterns = (p, answer) => analyzeArithmeticError(p, answer).patterns

describe('arithmetic error analysis precision', () => {
  it('keeps integer results unchanged, including a rounded answer to a non-integer target', () => {
    expect(patterns(problem('addition', 47, 35, 82, { carryCount: 1 }), 72)).toEqual(['carry_forget'])
    expect(patterns(problem('subtraction', 52, 38, 14, { borrowCount: 1 }), 26)).toEqual(['smaller_minus_larger'])
    expect(patterns(problem('subtraction', 12, 5, 7), 17)).toEqual(['operation_swap'])
    expect(patterns(problem('multiplication', 7, 8, 56), 63)).toEqual(['table_off_by_one'])
    expect(patterns(problem('division', 24, 6, 4), 6)).toEqual(['divisor_as_answer'])
  })

  it('requires exact place-value scaling instead of a ratio near 10', () => {
    expect(patterns(problem('addition', 40, 45, 85), 850)).toEqual(['place_value_error'])
    expect(patterns(problem('addition', 40, 45, 85), 830)).toEqual(['calculation_error'])
    expect(patterns(problem('multiplication', 3, 4, 12), 120)).toEqual(['place_value_error'])
    expect(patterns(problem('multiplication', 3, 4, 12), 118)).toEqual(['calculation_error'])
  })

  it('does not call a nearby decimal answer an operation swap', () => {
    // 6,27 − 5,84: swap gives 12,11; 12,0 is not that answer.
    expect(patterns(problem('subtraction', 6.27, 5.84, 0.43), 12)).toEqual(['calculation_error'])
    expect(patterns(problem('subtraction', 6.27, 5.84, 0.43), 12.11)).toEqual(['operation_swap'])
    // 0,43 × 10 = 4,3; a whole-number 4 is not an exact place-value shift.
    expect(patterns(problem('subtraction', 6.27, 5.84, 0.43), 4)).toEqual(['calculation_error'])
    expect(patterns(problem('subtraction', 6.27, 5.84, 0.43), 4.3)).toEqual(['place_value_error'])
  })

  it('applies column models to place-aligned decimals', () => {
    expect(patterns(problem('addition', 3.48, 2.67, 6.15), 5.05)).toEqual(['carry_forget'])
    expect(patterns(problem('subtraction', 6.42, 2.17, 4.25), 4.35)).toEqual(['smaller_minus_larger'])
  })

  it('derives borrow and carry need from the operands when metadata is missing', () => {
    expect(patterns(problem('subtraction', 52, 38, 14), 26)).toEqual(['smaller_minus_larger'])
    expect(patterns(problem('addition', 47, 35, 82), 72)).toEqual(['carry_forget'])
  })

  it('does not apply integer-only models to decimals or negative column cases', () => {
    expect(patterns(problem('multiplication', 2.5, 4, 10), 7.5)).toEqual(['calculation_error'])
    expect(patterns(problem('subtraction', 38, 52, -14), 26)).toEqual(['calculation_error'])
  })
})
