import { describe, expect, it } from 'vitest'
import numberFluencyDomain from './index.js'
import { getFluencyTargetSec } from '../../lib/operations.js'

describe('number fluency domain', () => {
  it('progresses number bonds through 10, 15 and 20 with reset fluency targets', () => {
    const expectedTargets = [10, 7, 4, 2, 10, 7, 4, 2, 10, 7, 4, 2]
    for (let level = 1; level <= 12; level += 1) {
      const problem = numberFluencyDomain.generate('number_bonds', level)
      const expectedSum = level <= 4 ? 10 : level <= 8 ? 15 : 20
      expect(problem.values.knownTerm + problem.answer.correct).toBe(expectedSum)
      expect(problem.metadata.fluencyTargetSec).toBe(expectedTargets[level - 1])
      expect(numberFluencyDomain.verifyContent(problem).valid).toBe(true)
    }
  })

  it('builds doubles to 76 before transferring the relation to other forms', () => {
    const level7 = Array.from({ length: 30 }, () => numberFluencyDomain.generate('doubles', 7))
    expect(level7.every(problem => problem.values.value >= 26 && problem.values.value <= 38)).toBe(true)
    expect(level7.some(problem => problem.answer.correct === 76)).toBe(true)

    for (let level = 8; level <= 12; level += 1) {
      const problem = numberFluencyDomain.generate('doubles', level)
      expect(numberFluencyDomain.verifyContent(problem).valid).toBe(true)
      expect(numberFluencyDomain.evaluate(problem, problem.answer.correct).correct).toBe(true)
      expect(getFluencyTargetSec('doubles', level)).toBeNull()
    }
  })
})
