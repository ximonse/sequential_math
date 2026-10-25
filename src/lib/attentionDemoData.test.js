import { describe, expect, it } from 'vitest'
import { ATTENTION_DEMO_PROFILES, attentionDemoHistory, makeAttentionDemoPass } from '../../robots/lib/attentionDemoData'
import { isValidAttentionResult } from './attentionHistory'
import { attentionMetric, attentionComparison, latestToday } from './attentionForm'

describe('synthetic attention demonstration', () => {
  it('generates valid, reproducible actual-model passes for all 20 varied pupils without mathematical data', () => {
    const now = Date.parse('2026-10-18T14:00:00Z')
    const ids = new Set()
    for (const [index, pupil] of ATTENTION_DEMO_PROFILES.entries()) {
      const history = attentionDemoHistory(pupil, index, now)
      expect(history).toHaveLength(75)
      expect(history.every(isValidAttentionResult)).toBe(true)
      for (const pass of history) { expect(ids.has(pass.id)).toBe(false); ids.add(pass.id); expect(pass).not.toHaveProperty('masteryFacts') }
    }
    expect(ATTENTION_DEMO_PROFILES.filter(pupil => pupil.type === 'normal')).toHaveLength(12)
    expect(ids.size).toBe(1500)
  })
  it('preserves the requested speed, error and endurance contrasts instead of manufacturing colors', () => {
    const now = Date.parse('2026-10-18T14:00:00Z')
    const make = (type, mode) => makeAttentionDemoPass(ATTENTION_DEMO_PROFILES.find(p => p.type === type), mode, now, 12345)
    expect(make('fast-right', 'discover').summary.median).toBeLessThan(350)
    expect(make('slow-right', 'discover').summary.median).toBeGreaterThan(1300)
    expect(make('fast-wrong', 'discover').summary.early).toBeGreaterThan(5)
    expect(make('fast-wrong', 'choose').summary.wrong).toBeGreaterThan(make('fast-right', 'choose').summary.wrong)
    expect(make('slow-wrong', 'multi').summary.wrong).toBeGreaterThan(make('slow-right', 'multi').summary.wrong)
    expect(attentionMetric(make('late-drop', 'discover'), 'endurance')).toBeGreaterThan(2)
  })
  it('compares a full class matrix with 1500 passes without blocking interaction', () => {
    const now = Date.parse('2026-10-18T14:00:00Z')
    const rows = ATTENTION_DEMO_PROFILES.map((profile, index) => ({ studentId: String(index), history: attentionDemoHistory(profile, index, now) }))
    const started = performance.now()
    const cells = rows.flatMap(row => [['speed', 'discover'], ['endurance', 'discover'], ['control', 'choose'], ['switching', 'multi']]
      .map(([metric, mode]) => attentionComparison(row, latestToday(row, mode, now), metric, rows, 'class', now)))
    expect(cells).toHaveLength(80)
    expect(cells.every(cell => cell.peers >= 8)).toBe(true)
    expect(performance.now() - started).toBeLessThan(3000)
  })
})
