import { describe, expect, it } from 'vitest'
import { numberBondCoverageKeys, numberBondTargets, fluencyLevelTargetSec, recordCoverageSample } from './coverageFluency'
import { advanceFluencyLap, isFluencyTopLevelFinish } from './fluencySession'

describe('complete timed number-bond rounds', () => {
  it('uses six foundation levels and two levels for each remaining family', () => {
    expect(Array.from({ length: 12 }, (_, i) => fluencyLevelTargetSec(i + 1))).toEqual([10,8,6,4,3,2,5,2,5,2,5,2])
    expect([1,6,7,8,9,10,11,12].map(numberBondTargets)).toEqual([[10],[10],[15],[15],[20],[20],[10,15,20],[10,15,20]])
  })
  it.each([1,2,3,4,5,6,7,8,9,10,11,12])('cannot leave level %s without every pair and valid timing', level => {
    const assignment = { minLevel: 1, maxLevel: 12 }
    let lap = { level, streak: 0 }
    const keys = numberBondCoverageKeys(level)
    for (const [i, key] of keys.entries()) {
      const [target, knownTerm] = key.split(':').map(Number)
      const problem = { skill: 'number_bonds', level, values: { target, knownTerm } }
      lap = advanceFluencyLap(lap, true, assignment, problem, 1)
      if (i < keys.length - 1) expect(lap.level).toBe(level)
    }
    if (level < 12) expect(lap.level).toBe(level + 1)
    else expect(isFluencyTopLevelFinish({ skill: 'number_bonds', level }, true, assignment, lap)).toBe(true)
    expect(keys.length).toBe(level <= 6 ? 11 : level <= 8 ? 16 : level <= 10 ? 21 : 48)
  })
  it('uses a strict mean and restarts a wrong, invalid or too slow round', () => {
    const keys = ['a','b']
    let first = recordCoverageSample({}, 'a', 3, true, keys, 2)
    expect(recordCoverageSample(first.samples, 'b', 0.5, true, keys, 2).complete).toBe(true)
    expect(recordCoverageSample(first.samples, 'b', 1, true, keys, 2).complete).toBe(false)
    expect(recordCoverageSample(first.samples, 'b', 0.5, false, keys, 2).samples).toEqual({})
    expect(recordCoverageSample(first.samples, 'b', null, true, keys, 2).samples).toEqual({})
    first = recordCoverageSample(first.samples, 'a', 0.5, true, keys, 2)
    expect(first.complete).toBe(false)
  })
})
