import { describe, expect, it } from 'vitest'
import {
  buildProblemNoveltyDescriptor,
  scoreCandidateNovelty
} from './problemNovelty'

describe('problemNovelty', () => {
  it('treats commutative arithmetic tasks as exact duplicates', () => {
    const first = buildProblemNoveltyDescriptor({
      skill: 'addition',
      level: 4,
      values: { a: 8, b: 47 }
    })
    const second = buildProblemNoveltyDescriptor({
      skill: 'addition',
      level: 4,
      values: { a: 47, b: 8 }
    })

    expect(first.exactKey).toBe(second.exactKey)
  })

  it('scores exact repeats much higher than fresh prompts', () => {
    const candidate = {
      skill: 'algebra_evaluate',
      level: 6,
      display: { text: 'Beräkna värdet av 2x + 5 när x = 4' },
      values: { expression: '2x + 5', variables: { x: 4 } }
    }
    const exactRepeat = {
      skill: 'algebra_evaluate',
      level: 6,
      display: { text: 'Beräkna värdet av 2x + 5 när x = 4' },
      values: { expression: '2x + 5', variables: { x: 4 } }
    }
    const fresh = {
      skill: 'algebra_evaluate',
      level: 6,
      display: { text: 'Beräkna värdet av 3y + 2 när y = 8' },
      values: { expression: '3y + 2', variables: { y: 8 } }
    }

    const repeatScore = scoreCandidateNovelty(candidate, [exactRepeat])
    const freshScore = scoreCandidateNovelty(candidate, [fresh])

    expect(repeatScore).toBeGreaterThan(freshScore)
    expect(repeatScore).toBeGreaterThan(50)
  })

  it('ignores history from other operations', () => {
    const candidate = {
      skill: 'fractions',
      level: 7,
      display: { text: '1/2 + 1/3' },
      values: { text: '1/2 + 1/3' }
    }
    const arithmeticHistory = {
      skill: 'addition',
      level: 7,
      values: { a: 12, b: 8 }
    }

    const score = scoreCandidateNovelty(candidate, [arithmeticHistory])
    expect(score).toBe(0)
  })
})
