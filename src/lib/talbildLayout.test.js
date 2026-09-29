import { describe, expect, it } from 'vitest'
import { createTalbildLayout, nextTalbildLevel, DIE_SIZE } from './talbildLayout'

const total = layout => layout.reduce((sum, die) => sum + die.length, 0)

describe('createTalbildLayout', () => {
  it('always shows exactly the asked number of dots at every level', () => {
    for (let level = 0; level <= 3; level += 1) {
      for (let value = 1; value <= 10; value += 1) {
        for (let run = 0; run < 20; run += 1) {
          expect(total(createTalbildLayout(value, level))).toBe(value)
        }
      }
    }
  })

  it('uses the classic 5 + rest split at level 0', () => {
    expect(createTalbildLayout(8, 0).map(die => die.length)).toEqual([5, 3])
    expect(createTalbildLayout(3, 0).map(die => die.length)).toEqual([3])
  })

  it('splits unevenly from level 1 and never leaves an empty die', () => {
    for (let run = 0; run < 50; run += 1) {
      const dice = createTalbildLayout(6, 1)
      expect(dice).toHaveLength(2)
      expect(dice.every(die => die.length >= 1)).toBe(true)
      expect(dice[0].length).not.toBe(5)
    }
  })

  it('keeps scattered dots apart and inside the die, even with varied sizes', () => {
    for (let run = 0; run < 200; run += 1) {
      for (const die of createTalbildLayout(9, 3)) {
        die.forEach((dot, index) => {
          const px = (dot.x / 100) * (DIE_SIZE - 6)
          const py = (dot.y / 100) * (DIE_SIZE - 6)
          expect(px - dot.size / 2).toBeGreaterThanOrEqual(0)
          expect(px + dot.size / 2).toBeLessThanOrEqual(DIE_SIZE - 6)
          expect(py - dot.size / 2).toBeGreaterThanOrEqual(0)
          expect(py + dot.size / 2).toBeLessThanOrEqual(DIE_SIZE - 6)
          die.slice(index + 1).forEach(other => {
            const ox = (other.x / 100) * (DIE_SIZE - 6)
            const oy = (other.y / 100) * (DIE_SIZE - 6)
            expect(Math.hypot(px - ox, py - oy)).toBeGreaterThan((dot.size + other.size) / 2)
          })
        })
      }
    }
  })

  it('varies dot sizes only at level 3', () => {
    const sizes = level => new Set(createTalbildLayout(9, level).flat().map(dot => dot.size))
    expect(sizes(2).size).toBe(1)
    let varied = false
    for (let run = 0; run < 10; run += 1) varied = varied || sizes(3).size > 1
    expect(varied).toBe(true)
  })
})

describe('nextTalbildLevel', () => {
  const fast = Array.from({ length: 5 }, () => ({ isCorrect: true, timeMs: 1500 }))
  const slow = Array.from({ length: 5 }, () => ({ isCorrect: true, timeMs: 7000 }))

  it('waits for a full window', () => {
    expect(nextTalbildLevel(0, fast.slice(0, 4))).toEqual({ level: 0, resetWindow: false })
  })

  it('climbs on five fast correct answers, capped at the top level', () => {
    expect(nextTalbildLevel(0, fast)).toEqual({ level: 1, resetWindow: true })
    expect(nextTalbildLevel(3, fast)).toEqual({ level: 3, resetWindow: false })
  })

  it('steps back after a slow window, but not below zero', () => {
    expect(nextTalbildLevel(2, slow)).toEqual({ level: 1, resetWindow: true })
    expect(nextTalbildLevel(0, slow)).toEqual({ level: 0, resetWindow: false })
  })
})
