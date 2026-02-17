import { describe, expect, it } from 'vitest'
import {
  getSpeedTime,
  inferOperationFromProblemType,
  inferTableFromProblem,
  median
} from './mathUtils'

describe('mathUtils', () => {
  describe('inferOperationFromProblemType', () => {
    it('maps common template prefixes', () => {
      expect(inferOperationFromProblemType('add_1d_1d_no_carry')).toBe('addition')
      expect(inferOperationFromProblemType('sub_2d_1d_borrow')).toBe('subtraction')
      expect(inferOperationFromProblemType('mul_1d_1d_easy')).toBe('multiplication')
      expect(inferOperationFromProblemType('div_3d_2d_full')).toBe('division')
    })

    it('supports configurable fallback handling', () => {
      expect(inferOperationFromProblemType('', { fallback: 'addition' })).toBe('addition')
      expect(inferOperationFromProblemType('mystery_thing')).toBe('mystery')
      expect(inferOperationFromProblemType('mystery_thing', { allowUnknownPrefix: false })).toBe('unknown')
    })
  })

  describe('median', () => {
    it('returns middle value for odd/even length lists', () => {
      expect(median([3, 1, 2])).toBe(2)
      expect(median([1, 2, 3, 4])).toBe(2.5)
    })

    it('respects positiveOnly option', () => {
      expect(median([0, 1, 2])).toBe(1.5)
      expect(median([0, 1, 2], { positiveOnly: false })).toBe(1)
      expect(median([])).toBe(null)
    })
  })

  describe('getSpeedTime', () => {
    it('prioritizes speedTimeSec and falls back to timeSpent', () => {
      expect(getSpeedTime({ speedTimeSec: 4.2, timeSpent: 10 })).toBe(4.2)
      expect(getSpeedTime({ timeSpent: 9.5 })).toBe(9.5)
      expect(getSpeedTime({ excludedFromSpeed: true, timeSpent: 9.5 })).toBe(null)
    })
  })

  describe('inferTableFromProblem', () => {
    it('reads table from skillTag or multiplication operands', () => {
      expect(inferTableFromProblem({ skillTag: 'mul_table_7' })).toBe(7)
      expect(inferTableFromProblem({
        problemType: 'mul_1d_1d_easy',
        values: { a: 6, b: 8 }
      })).toBe(6)
      expect(inferTableFromProblem({
        problemType: 'add_1d_1d_no_carry',
        values: { a: 6, b: 8 }
      })).toBe(null)
    })
  })
})
