import { describe, expect, it } from 'vitest'
import { focusSignal } from './attentionSignals'

const now = Date.UTC(2026, 9, 16, 12)
const pass = (day, hits = 8, misses = 2, changes = {}) => ({
  id: `p-${day}`, version: 1, mode: 'choose', startedAt: now - day * 86400000 - 120000,
  finishedAt: now - day * 86400000, activeMs: 120000, aborted: false,
  summary: { hits, misses, wrong: 0, withheld: 0, early: 0, median: hits ? 300 : null }, ...changes
})

describe('preliminary focus descriptions', () => {
  it('waits for several days, distinguishes no answers from observed zero, and ignores aborted passes', () => {
    expect(focusSignal([], 'choose-go')).toMatchObject({ color: 'white', total: 0 })
    expect(focusSignal([pass(0, 20, 0)], 'choose-go').color).toBe('white')
    const sameDay = Array.from({ length: 5 }, (_, i) => pass(0, 8, 0, { id: `same-${i}` }))
    expect(focusSignal(sameDay, 'choose-go')).toMatchObject({ color: 'white', days: 1 })
    expect(focusSignal([0, 1, 2].map(day => pass(day, 0, 10)), 'choose-go')).toMatchObject({ color: 'yellow', correct: 0, total: 30 })
    expect(focusSignal([0, 1, 2].map(day => pass(day, 0, 10, { aborted: true })), 'choose-go')).toMatchObject({ color: 'white', total: 0, aborted: 3 })
  })
  it('uses a broad green zone and more evidence for blue without deriving norms from visible peers', () => {
    expect(focusSignal([0, 1, 2].map(day => pass(day, 6, 4)), 'choose-go').color).toBe('green')
    expect(focusSignal([0, 1, 2].map(day => pass(day, 10, 0)), 'choose-go').color).toBe('green')
    expect(focusSignal([0, 1, 2, 3, 4].map(day => pass(day, 10, 0)), 'choose-go').color).toBe('blue')
    expect(focusSignal([0, 1, 2, 3, 4].map(day => pass(day, 9, 1)), 'choose-go').color).toBe('green')
    for (const hits of [0, 1, 3, 6, 8, 10]) expect(['red', 'orange']).not.toContain(focusSignal([0, 1, 2, 3, 4].map(day => pass(day, hits, 10 - hits)), 'choose-go').color)
  })
  it('does not let many answers on one day overwhelm contrary days or count sparse days as sufficient evidence', () => {
    const history = [pass(0, 40, 0), pass(1, 0, 4), pass(2, 0, 4)]
    expect(focusSignal(history, 'choose-go').color).toBe('yellow')
    expect(focusSignal([pass(0, 10, 0), pass(1, 1, 0), pass(2, 1, 0)], 'choose-go').color).toBe('white')
  })
  it('keeps detecting, withholding and switching separate; no stop or switch trials is not a failure', () => {
    const choose = [0, 1, 2].map(day => pass(day, 6, 4, { mode: 'choose', summary: { hits: 6, misses: 4, wrong: 4, withheld: 0, early: 0, median: 200 } }))
    expect(focusSignal(choose, 'choose-go').color).toBe('green')
    expect(focusSignal(choose, 'choose-stop').color).toBe('yellow')
    expect(focusSignal([0, 1, 2].map(day => pass(day, 6, 4, { mode: 'choose' })), 'choose-stop').color).toBe('white')
    const multi = [0, 1, 2].map(day => pass(day, 0, 0, { mode: 'multi', summary: { total: 16, correct: 11, wrong: 5, missed: 0,
      repeat: { total: 10, correct: 10, median: 200 }, switch: { total: 5, correct: 0, median: null } } }))
    expect(focusSignal(multi, 'multi-switch')).toMatchObject({ color: 'white', total: 15 })
  })
  it('uses Stockholm calendar days, not UTC dates or pass count', () => {
    const first = pass(0, 10, 0, { startedAt: Date.UTC(2026, 9, 14, 21, 58), finishedAt: Date.UTC(2026, 9, 14, 22) })
    const second = pass(1, 10, 0, { startedAt: Date.UTC(2026, 9, 15, 9, 58), finishedAt: Date.UTC(2026, 9, 15, 10) })
    expect(focusSignal([first, second], 'choose-go').days).toBe(1)
  })
  it('needs repeated non-overlapping day patterns for an arrow and keeps history immutable', () => {
    const up = [5, 4, 3].map(day => pass(day, 3, 7)).concat([2, 1, 0].map(day => pass(day, 8, 2)))
    const before = structuredClone(up)
    expect(focusSignal(up, 'choose-go').trend.mark).toBe('↗')
    expect(up).toEqual(before)
    const down = [5, 4, 3].map(day => pass(day, 9, 1)).concat([2, 1, 0].map(day => pass(day, 4, 6)))
    expect(focusSignal(down, 'choose-go').trend.mark).toBe('↘')
    const mixed = [0, 1, 2, 3, 4, 5].map(day => pass(day, day % 2 ? 5 : 8, day % 2 ? 5 : 2))
    expect(focusSignal(mixed, 'choose-go').trend.mark).toBe('↔')
    expect(focusSignal(mixed.slice(0, 3), 'choose-go').trend.mark).toBe('·')
  })
})
