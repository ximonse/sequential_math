import { describe, expect, it } from 'vitest'
import { advanceFluencyLap, getFluencyLevelRange, getFluencyStep, getFluencyTarget,
  isFluencyAssignment, isFluencyTopLevelFinish, startFluencyLap } from './fluencySession'

describe('fluencySession', () => {
  it('recognises only talpar/dubblor assignments', () => {
    expect(isFluencyAssignment({ problemTypes: ['number_bonds'] })).toBe(true)
    expect(isFluencyAssignment({ problemTypes: ['doubles', 'number_bonds'] })).toBe(true)
    expect(isFluencyAssignment({ problemTypes: ['doubles', 'percentage'] })).toBe(false)
    expect(isFluencyAssignment({ problemTypes: [] })).toBe(false)
    expect(isFluencyAssignment(null)).toBe(false)
  })

  it('uses the teacher cap and falls back to 20', () => {
    expect(getFluencyTarget({ targetCount: 12 })).toBe(12)
    expect(getFluencyTarget({})).toBe(20)
    expect(getFluencyTarget({ targetCount: 0 })).toBe(20)
  })

  it('praises mid-way, breaks every 15, and finishes at the cap without a break', () => {
    expect(getFluencyStep(8, 40).kind).toBe('praise')
    expect(getFluencyStep(8, 40).message).toBeTruthy()
    expect(getFluencyStep(15, 40).kind).toBe('break')
    expect(getFluencyStep(23, 40).kind).toBe('praise')
    expect(getFluencyStep(30, 40).kind).toBe('break')
    expect(getFluencyStep(30, 30).kind).toBe('done')
    expect(getFluencyStep(5, 20).kind).toBe('none')
  })

  it('treats the assignment top level, or 12, as the top', () => {
    expect(getFluencyLevelRange({ minLevel: 3, maxLevel: 6 })).toEqual([3, 6])
    expect(getFluencyLevelRange({})).toEqual([1, 12])
    expect(isFluencyTopLevelFinish({ level: 6 }, true, { minLevel: 1, maxLevel: 6 })).toBe(true)
    expect(isFluencyTopLevelFinish({ level: 12 }, true, {})).toBe(true)
    expect(isFluencyTopLevelFinish({ level: 11 }, true, {})).toBe(false)
    expect(isFluencyTopLevelFinish({ level: 12 }, false, {})).toBe(false)
  })

  it('climbs a restarted lap one level per three correct in a row and stops at the top', () => {
    const assignment = { minLevel: 1, maxLevel: 2 }
    let lap = startFluencyLap(assignment)
    expect(lap).toEqual({ level: 1, streak: 0 })
    lap = advanceFluencyLap(advanceFluencyLap(lap, true, assignment), true, assignment)
    lap = advanceFluencyLap(lap, false, assignment)
    expect(lap).toEqual({ level: 1, streak: 0 })
    for (let i = 0; i < 3; i++) lap = advanceFluencyLap(lap, true, assignment)
    expect(lap).toEqual({ level: 2, streak: 0 })
    for (let i = 0; i < 3; i++) lap = advanceFluencyLap(lap, true, assignment)
    expect(lap.level).toBe(2)
    expect(advanceFluencyLap(null, true, assignment)).toBe(null)
  })
})
