import { describe, expect, it } from 'vitest'
import { generateAlgebraProblem } from './algebra/generate'
import { generateFractionsProblem } from './fractions/generate'
import { generatePercentageProblem } from './percentage/generate'

function collectPrompts(count, factory) {
  const prompts = []
  for (let i = 0; i < count; i += 1) {
    prompts.push(String(factory()?.display?.text || '').trim())
  }
  return prompts
}

describe('domain generators variety', () => {
  it('algebra evaluate level 5 produces multiple prompt variants', () => {
    const prompts = collectPrompts(24, () => generateAlgebraProblem('algebra_evaluate', 5))
    expect(new Set(prompts).size).toBeGreaterThan(8)
  })

  it('fractions level 11 rotates across many predefined cases', () => {
    const prompts = collectPrompts(10, () => generateFractionsProblem('fractions', 11))
    expect(new Set(prompts).size).toBe(10)
  })

  it('fractions level 3 is a dedicated simplify-focus level', () => {
    const problems = Array.from({ length: 12 }, () => generateFractionsProblem('fractions', 3))
    expect(problems.every(problem => problem.metadata?.requiresSimplifiedAnswer === true)).toBe(true)
    expect(problems.every(problem => String(problem.display?.text || '').startsWith('Förenkla:'))).toBe(true)
  })

  it('fractions higher levels keep a mix of simplify and non-simplify prompts', () => {
    const flags = Array.from(
      { length: 15 },
      () => Boolean(generateFractionsProblem('fractions', 8).metadata?.requiresSimplifiedAnswer)
    )
    expect(new Set(flags).size).toBeGreaterThan(1)
  })

  it('percentage level 1 uses a wider prompt pool', () => {
    const prompts = collectPrompts(24, () => generatePercentageProblem('percentage', 1))
    expect(new Set(prompts).size).toBeGreaterThan(10)
  })
})
