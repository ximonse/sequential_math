import { describe, expect, it } from 'vitest'
import { generateAlgebraProblem } from './algebra/generate'
import { generateFractionsProblem } from './fractions/generate'
import { generatePercentageProblem } from './percentage/generate'
import { createProblemForSelection } from '../engine/adaptiveEngine'
import { listDomains } from './registry'

function collectPrompts(count, factory) {
  const prompts = []
  for (let i = 0; i < count; i += 1) {
    prompts.push(String(factory()?.display?.text || '').trim())
  }
  return prompts
}

function minimumUniquePrompts(domainId, skillId, level) {
  if (skillId === 'algebra_simplify' && level === 1) return 3
  if (domainId === 'arithmetic'
    && ['multiplication', 'division'].includes(skillId)
    && level === 1) return 6
  return 8
}

describe('domain generators variety', () => {
  it('meets a minimum prompt-variety floor for every registered skill level', () => {
    const failures = []
    for (const domain of listDomains()) {
      // Geometry uses a reviewed finite card bank. Its domain tests verify every
      // card and complete-cycle novelty; prompt paraphrases are not variation.
      if (domain.id === 'geometry') continue
      for (const skill of domain.skills) {
        const [min, max] = skill.levels
        for (let level = min; level <= max; level += 1) {
          const prompts = collectPrompts(24, () => createProblemForSelection({
            domain: domain.id,
            skill: skill.id,
            level
          }))
          const minimumUnique = minimumUniquePrompts(domain.id, skill.id, level)
          const unique = new Set(prompts).size
          if (unique < minimumUnique) {
            failures.push({ domain: domain.id, skill: skill.id, level, unique, minimumUnique })
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('algebra evaluate level 5 produces multiple prompt variants', () => {
    const prompts = collectPrompts(24, () => generateAlgebraProblem('algebra_evaluate', 5))
    expect(new Set(prompts).size).toBeGreaterThan(8)
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
