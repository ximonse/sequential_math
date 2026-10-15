import { describe, expect, it } from 'vitest'
import { attentionPassStatistics, attentionRate, filterAttentionResults, summarizeAttentionResults } from './attentionStatistics'

const now = Date.UTC(2026, 9, 15, 12)
function focus(id, { hits = 1, misses = 0, wrong = 0, withheld = 1, early = 0, aborted = false, activeMs = 120000, finishedAt = now } = {}) {
  return { id, version: 1, mode: 'choose', startedAt: finishedAt - activeMs, finishedAt, activeMs, aborted,
    summary: { hits, misses, wrong, withheld, early, median: hits ? 200 : null } }
}
describe('teacher attention statistics', () => {
  it('pools counts by signal type rather than averaging percentages, and excludes aborted passes', () => {
    const results = [focus('a', { early: 2 }), focus('b', { hits: 1, misses: 8, withheld: 2, wrong: 2, early: 4 }), focus('aborted', { hits: 20, withheld: 0, early: 90, aborted: true, activeMs: 10000 })]
    const [group] = summarizeAttentionResults(results)
    expect(group).toMatchObject({ completed: 2, aborted: 1, go: { correct: 2, total: 10, percent: 20 }, stop: { correct: 3, total: 5, percent: 60 }, earlyPerMinute: 1.5 })
    expect(group).not.toHaveProperty('median')
  })
  it('normalizes early presses by active time and does not invent zero accuracy for missing evidence', () => {
    const stats = attentionPassStatistics(focus('short', { hits: 0, withheld: 0, early: 3, aborted: true, activeMs: 30000 }))
    expect(stats).toMatchObject({ go: { percent: null, total: 0 }, stop: { percent: null }, earlyPerMinute: 6 })
    expect(attentionPassStatistics(focus('zero', { aborted: true, activeMs: 0 })).earlyPerMinute).toBe(null)
    expect(attentionRate(0, 3).percent).toBe(0)
  })
  it('separates activities and reports no invented completed data for a mode with only aborts', () => {
    const discover = { ...focus('discover', { withheld: 0 }), mode: 'discover' }
    const groups = summarizeAttentionResults([discover, focus('abort', { aborted: true })])
    expect(groups.map(g => g.mode)).toEqual(['discover', 'choose'])
    expect(groups[1]).toMatchObject({ completed: 0, go: { percent: null }, earlyPerMinute: null })
  })
  it('compares MULTI transitions within a pass without including its first trial', () => {
    const result = { mode: 'multi', summary: { total: 5, correct: 3, wrong: 1, missed: 1,
      repeat: { total: 2, correct: 2, median: 300 }, switch: { total: 2, correct: 0, median: null } } }
    expect(attentionPassStatistics(result)).toMatchObject({ accuracy: { percent: 60 }, repeat: { percent: 100 }, switch: { percent: 0 }, switchTimeDifference: null })
    result.summary.switch.correct = 1; result.summary.switch.median = 450
    expect(attentionPassStatistics(result).switchTimeDifference).toBe(150)
    result.summary.switch.median = 250
    expect(attentionPassStatistics(result).switchTimeDifference).toBe(-50)
  })
  it('applies period and mode filters to all stored passes, deduplicating IDs without changing source data', () => {
    const history = [focus('recent'), focus('old', { finishedAt: now - 8 * 86400000 }), focus('future', { finishedAt: now + 1000 })]
    const before = structuredClone(history)
    expect(filterAttentionResults([...history, history[0]], { days: '7', now }).map(r => r.id)).toEqual(['recent'])
    expect(filterAttentionResults(history, { days: '30', now }).map(r => r.id)).toEqual(['recent', 'old'])
    expect(filterAttentionResults(history, { mode: 'multi' })).toEqual([])
    expect(history).toEqual(before)
  })
})
