import { beforeEach, describe, expect, it } from 'vitest'
import { pickFromRotation, resetRotationStore } from './rotationPicker'

describe('rotationPicker', () => {
  beforeEach(() => {
    resetRotationStore()
  })

  it('cycles through all entries before repeating', () => {
    const source = ['a', 'b', 'c', 'd']
    const picks = [
      pickFromRotation('test:key', source),
      pickFromRotation('test:key', source),
      pickFromRotation('test:key', source),
      pickFromRotation('test:key', source)
    ]

    expect(new Set(picks).size).toBe(source.length)
  })

  it('avoids immediate repeats when a new cycle starts', () => {
    const source = ['x', 'y', 'z']
    const picks = []
    for (let i = 0; i < 9; i += 1) {
      picks.push(pickFromRotation('test:repeat', source))
    }

    for (let i = 1; i < picks.length; i += 1) {
      expect(picks[i]).not.toBe(picks[i - 1])
    }
  })
})
