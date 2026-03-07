import { describe, expect, it } from 'vitest'
import { classifyErrorCategory } from './studentProfileTimingHelpers'

describe('classifyErrorCategory', () => {
  it('classifies operation swap as inattention for subtraction answered as addition', () => {
    const problem = {
      type: 'subtraction',
      skill: 'subtraction',
      values: { a: 47, b: 18 },
      answer: { correct: 29 },
      result: 29
    }

    const category = classifyErrorCategory(problem, 65, false, {}, null)
    expect(category).toBe('inattention')
  })

  it('keeps explicit domain category when present', () => {
    const problem = {
      type: 'subtraction',
      skill: 'subtraction',
      values: { a: 47, b: 18 },
      answer: { correct: 29 },
      result: 29
    }

    const category = classifyErrorCategory(problem, 65, false, {}, { category: 'knowledge' })
    expect(category).toBe('knowledge')
  })
})
