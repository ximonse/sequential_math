import { describe, expect, it } from 'vitest'
import numberFluencyDomain from './index.js'
import { getFluencyTargetSec } from '../../lib/operations.js'

describe('number fluency domain', () => {
  it('progresses number bonds through 10, 15 and 20 with reset fluency targets', () => {
    const expectedTargets = [10, 4, 2, 10, 4, 2, 10, 4, 2, 10, 4, 2]
    for (let level = 1; level <= 12; level += 1) {
      const problem = numberFluencyDomain.generate('number_bonds', level)
      const expectedSum = level >= 10 ? problem.values.target : level <= 3 ? 10 : level <= 6 ? 15 : 20
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


it.each([10, 11, 12])('mixes all three targets and shuffles their pairs on level %s', level => {
  const targets = []
  const terms = new Map([10, 15, 20].map(n => [n, new Set()]))
  for (let i = 0; i < 126; i++) {
    const problem = numberFluencyDomain.generate('number_bonds', level)
    expect(problem.level).toBe(level)
    const { target, knownTerm } = problem.values
    targets.push(target)
    terms.get(target).add(knownTerm)
    expect(knownTerm + problem.answer.correct).toBe(target)
    expect(numberFluencyDomain.verifyContent(problem).valid).toBe(true)
  }
  expect(new Set(targets)).toEqual(new Set([10, 15, 20]))
  for (const target of [10, 15, 20]) expect(terms.get(target).size).toBe(target + 1)
})


it('distributes single-target number bonds across three levels per family', () => {
  for (let level = 1; level <= 9; level++) {
    const expected = level <= 3 ? 10 : level <= 6 ? 15 : 20
    expect(numberFluencyDomain.generate('number_bonds', level).values.target).toBe(expected)
  }
})
