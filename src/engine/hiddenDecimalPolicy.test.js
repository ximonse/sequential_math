import { describe, expect, it } from 'vitest'
import { chooseHiddenDecimalEvidence } from './hiddenDecimalPolicy'

describe('hidden decimal policy', () => {
  it('uses a 25 percent baseline only at supported addition and subtraction levels', () => {
    expect(chooseHiddenDecimalEvidence({ skill: 'addition', level: 4, decimalFloor: 1, roll: 0.24 })).toBe('positions_decimal')
    expect(chooseHiddenDecimalEvidence({ skill: 'addition', level: 4, decimalFloor: 1, roll: 0.25 })).toBeNull()
    expect(chooseHiddenDecimalEvidence({ skill: 'multiplication', level: 4, decimalFloor: 1, roll: 0 })).toBeNull()
    expect(chooseHiddenDecimalEvidence({ skill: 'addition', level: 6, decimalFloor: 1, roll: 0 })).toBeNull()
  })

  it('repeats more often when decimal progression is behind and never alters locked focus', () => {
    expect(chooseHiddenDecimalEvidence({ skill: 'subtraction', level: 8, decimalFloor: 2, roll: 0.49 })).toBe('positions_decimal')
    expect(chooseHiddenDecimalEvidence({ skill: 'subtraction', level: 8, decimalFloor: 2, forcedLevel: 8, roll: 0 })).toBeNull()
  })
})