import { describe, expect, it } from 'vitest'
import { evaluateAlgebraProblem } from './evaluate'

describe('evaluateAlgebraProblem (expression answers)', () => {
  const simplifyProblem = {
    answer: {
      type: 'expression',
      correct: 'a'
    }
  }

  it('accepts exact simplified notation as fully correct', () => {
    const result = evaluateAlgebraProblem(simplifyProblem, 'a')
    expect(result.correct).toBe(true)
    expect(result.isPartial).toBe(false)
  })

  it('accepts explicit unit coefficient as partial', () => {
    const result = evaluateAlgebraProblem(simplifyProblem, '1a')
    expect(result.correct).toBe(true)
    expect(result.isPartial).toBe(true)
    expect(result.partialCode).toBe('explicit_unit_coefficient')
  })

  it('rejects incorrect expressions', () => {
    const result = evaluateAlgebraProblem(simplifyProblem, '2a')
    expect(result.correct).toBe(false)
    expect(result.isPartial).toBe(false)
  })
})
