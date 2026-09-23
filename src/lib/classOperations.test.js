import { describe, expect, it } from 'vitest'
import { classOperationsAreValid, resolveClassOperations } from './classOperations'

describe('class operation selection', () => {
  it('keeps the four basics and legacy extras for older classes', () => {
    expect(resolveClassOperations({ enabledExtras: ['fractions'] })).toEqual([
      'addition', 'subtraction', 'multiplication', 'division', 'fractions'
    ])
  })

  it('lets a class explicitly remove division without changing its history', () => {
    expect(resolveClassOperations({
      enabledOperations: ['addition', 'subtraction', 'multiplication', 'fractions'],
      enabledExtras: ['fractions']
    })).toEqual(['addition', 'subtraction', 'multiplication', 'fractions'])
  })

  it('rejects empty, duplicate and unknown settings', () => {
    expect(classOperationsAreValid([])).toBe(false)
    expect(classOperationsAreValid(['addition', 'addition'])).toBe(false)
    expect(classOperationsAreValid(['unknown'])).toBe(false)
    expect(classOperationsAreValid(['addition', 'fractions'])).toBe(true)
  })
})
