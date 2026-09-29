import { describe, expect, it } from 'vitest'
import { getFluencyStep, getFluencyTarget, isFluencyAssignment } from './fluencySession'

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
})
