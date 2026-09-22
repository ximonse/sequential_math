import { describe, expect, it } from 'vitest'
import geometryDomain from './index'

describe('geometry domain', () => {
  it('independently verifies every implemented skill level', () => {
    for (const skill of geometryDomain.skills) {
      for (let level = skill.levels[0]; level <= skill.levels[1]; level += 1) {
        const problem = geometryDomain.generate(skill.id, level)
        expect(geometryDomain.verifyContent(problem), `${skill.id}/${level}`).toEqual({ valid: true, reason: '' })
        expect(geometryDomain.evaluate(problem, problem.answer.correct).correct).toBe(true)
      }
    }
  })

  it('rejects a corrupted stored answer', () => {
    const problem = geometryDomain.generate('geometry_2d_objects', 4)
    problem.answer.correct = problem.answer.correct === 'yes' ? 'no' : 'yes'
    expect(geometryDomain.verifyContent(problem).valid).toBe(false)
  })

  it('maps a distractor to an explicit error hypothesis', () => {
    const problem = geometryDomain.generate('geometry_2d_objects', 1)
    const distractor = problem.values.options.find(item => item.id !== problem.answer.correct)
    expect(geometryDomain.analyzeError(problem, distractor.id)).toMatchObject({ category: 'misconception' })
  })
})
