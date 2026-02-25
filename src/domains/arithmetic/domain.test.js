import { describe, expect, it } from 'vitest'
import { generateArithmeticProblem } from './generate'
import { evaluateArithmeticProblem } from './evaluate'
import { analyzeArithmeticError } from './analyzeError'

describe('arithmetic domain', () => {
  it('generate returns a normalized arithmetic problem shape', () => {
    const problem = generateArithmeticProblem('addition', 4, {
      allowedTypes: ['addition']
    })

    expect(problem).toBeTruthy()
    expect(problem.domain).toBe('arithmetic')
    expect(problem.skill).toBe('addition')
    expect(problem.level).toBeGreaterThanOrEqual(1)
    expect(problem.level).toBeLessThanOrEqual(12)
    expect(problem.answer?.type).toBe('number')
    expect(problem.answer?.correct).toBe(problem.result)
    expect(problem.display?.type).toBe('expression')
    expect(typeof problem.display?.text).toBe('string')
    expect(problem.display?.text.includes('+')).toBe(true)
  })

  it('evaluate returns correct:true for right answer', () => {
    const problem = {
      type: 'addition',
      values: { a: 8, b: 47 },
      result: 55,
      answer: { type: 'number', correct: 55 },
      difficulty: { conceptual_level: 4 }
    }

    const evaluation = evaluateArithmeticProblem(problem, 55)
    expect(evaluation.correct).toBe(true)
    expect(evaluation.studentAnswer).toBe(55)
    expect(typeof evaluation.isReasonable).toBe('boolean')
  })

  it('analyzeError returns carry_error when carry problems are missed', () => {
    const problem = {
      type: 'addition',
      values: { a: 47, b: 35 },
      result: 82,
      answer: { type: 'number', correct: 82 },
      difficulty: { conceptual_level: 4 },
      metadata: { carryCount: 1 }
    }

    const analysis = analyzeArithmeticError(problem, 72)
    expect(analysis.category).toBe('knowledge')
    expect(analysis.patterns).toContain('carry_forget')
  })

  it('analyzeError marks subtraction operation swap as inattention', () => {
    const problem = {
      type: 'subtraction',
      values: { a: 12, b: 5 },
      result: 7,
      answer: { type: 'number', correct: 7 },
      difficulty: { conceptual_level: 2 }
    }

    const analysis = analyzeArithmeticError(problem, 17)
    expect(analysis.category).toBe('inattention')
    expect(analysis.patterns).toContain('operation_swap')
  })
})
