import { describe, expect, it } from 'vitest'
import { evaluateFractionsProblem } from './evaluate'

describe('evaluateFractionsProblem', () => {
  const baseProblem = {
    answer: {
      num: 1,
      den: 2
    },
    metadata: {}
  }

  it('accepts equivalent non-simplified answers when simplification is not required', () => {
    const result = evaluateFractionsProblem(baseProblem, '2/4')
    expect(result.correct).toBe(true)
    expect(result.isPartial).toBe(false)
  })

  it('marks equivalent non-simplified answers as partial when simplification is required', () => {
    const result = evaluateFractionsProblem({
      ...baseProblem,
      metadata: { requiresSimplifiedAnswer: true }
    }, '2/4')

    expect(result.correct).toBe(true)
    expect(result.isPartial).toBe(true)
    expect(result.partialCode).toBe('not_simplified')
  })

  it('marks fully simplified answers as full correct when simplification is required', () => {
    const result = evaluateFractionsProblem({
      ...baseProblem,
      metadata: { requiresSimplifiedAnswer: true }
    }, '1/2')

    expect(result.correct).toBe(true)
    expect(result.isPartial).toBe(false)
  })
})
