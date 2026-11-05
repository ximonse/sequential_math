import { describe, expect, it } from 'vitest'
import { talbildLayoutStage, createTalbildLayout, nextTalbildLevel, nextTalbildValue, DIE_SIZE } from './talbildLayout'

const total = layout => layout.reduce((sum, die) => sum + die.length, 0)

describe('createTalbildLayout', () => {
  it('always shows exactly the asked number of dots at every level', () => {
    for (let level = 0; level <= 3; level += 1) {
      for (let value = 1; value <= 10; value += 1) {
        for (let run = 0; run < 20; run += 1) {
          const dice = createTalbildLayout(value, level)
          expect(total(dice)).toBe(value)
          expect(dice).toHaveLength(value <= 5 ? 1 : 2)
          expect(dice.every(die => die.length >= 1 && die.length <= 5)).toBe(true)
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

  it('never repeats the previous number, including at the random boundaries', () => {
    for (let previous = 1; previous <= 10; previous += 1) {
      for (const random of [0, 0.25, 0.5, 0.999999]) {
        const next = nextTalbildValue(previous, () => random)
        expect(next).toBeGreaterThanOrEqual(1)
        expect(next).toBeLessThanOrEqual(10)
        expect(next).not.toBe(previous)
      }
    }
    expect(nextTalbildValue(null, () => 0)).toBe(1)
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
  const round = timeMs => Array.from({ length: 10 }, (_, i) => ({ correctAnswer: i + 1, isCorrect: true, timeMs }))
  it('keeps conventional dice for six levels and requires every value', () => {
    for (let level = 0; level < 6; level++) {
      expect(talbildLayoutStage(level)).toBe(0)
      expect(nextTalbildLevel(level, round(1000).slice(0, 9)).level).toBe(level)
      expect(nextTalbildLevel(level, round(1000)).level).toBe(level + 1)
    }
    expect([6,7,8,9,10,11].map(talbildLayoutStage)).toEqual([1,1,2,2,3,3])
  })
  it('uses a strict mean below two seconds to leave conventional dice', () => {
    expect(nextTalbildLevel(5, round(2000)).level).toBe(5)
    const mixedTimes = round(1000); mixedTimes[0].timeMs = 3000
    expect(nextTalbildLevel(5, mixedTimes).level).toBe(6)
  })
  it('restarts a failed round without lowering the level and finishes after all twelve', () => {
    const answers = round(1000); answers[5].isCorrect = false
    expect(nextTalbildLevel(5, answers).level).toBe(5)
    expect(nextTalbildLevel(5, round(12000)).level).toBe(5)
    expect(nextTalbildLevel(11, round(1000))).toEqual({ level: 11, resetWindow: true, complete: true })
  })
})
