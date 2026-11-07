import { describe, expect, it } from 'vitest'
import { evaluateAlgebraProblem } from './evaluate'
import { generateAlgebraProblem } from './generate'

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

// Simon 2026-11-07: "x" was marked wrong when the answer key said "1x".
describe('unit coefficient in the answer key', () => {
  it('accepts the conventional form as fully correct when the key writes 1x', () => {
    for (const [key, answer] of [['1x', 'x'], ['1x + 4', 'x + 4'], ['3y + 1x', 'x + 3y']]) {
      const result = evaluateAlgebraProblem({ answer: { type: 'expression', correct: key } }, answer)
      expect(result.correct).toBe(true)
      expect(result.isPartial).toBe(false)
    }
  })

  it('still rejects a different coefficient', () => {
    expect(evaluateAlgebraProblem({ answer: { type: 'expression', correct: '1x' } }, '2x').correct).toBe(false)
  })

  it('never generates an answer key with a written 1 in front of a variable', () => {
    for (let level = 1; level <= 12; level++) {
      for (let i = 0; i < 200; i++) {
        const problem = generateAlgebraProblem('algebra_simplify', level)
        expect(problem.answer.correct).not.toMatch(/(^|[+\-−]\s*)1[a-z]/)
      }
    }
  })
})
