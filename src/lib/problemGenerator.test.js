import { describe, it, expect } from 'vitest'
import { divisionTemplates } from '../data/templates/divisionTemplates'
import { generateProblem } from './problemGenerator'

function inRange(value, min, max) {
  return value >= min && value <= max
}

describe('problemGenerator exact division', () => {
  const templateIds = [
    'div_3d_2d_guided',
    'div_3d_2d_full',
    'div_4d_2d_full',
    'div_4d_3d_full'
  ]

  for (const templateId of templateIds) {
    it(`generates non-fallback exact tasks for ${templateId}`, () => {
      const template = divisionTemplates.find(item => item.id === templateId)
      expect(template).toBeTruthy()

      const { constraints } = template.generator
      for (let i = 0; i < 80; i++) {
        const problem = generateProblem(template, 300)

        expect(problem.id.includes('_fallback_')).toBe(false)
        expect(Number.isInteger(problem.values.a)).toBe(true)
        expect(Number.isInteger(problem.values.b)).toBe(true)
        expect(problem.values.b).not.toBe(0)
        expect(problem.values.a % problem.values.b).toBe(0)
        expect(problem.result).toBe(problem.values.a / problem.values.b)

        expect(inRange(problem.values.a, constraints.a.min, constraints.a.max)).toBe(true)
        expect(inRange(problem.values.b, constraints.b.min, constraints.b.max)).toBe(true)
        expect(inRange(problem.result, constraints.result.min, constraints.result.max)).toBe(true)
      }
    })
  }
})
