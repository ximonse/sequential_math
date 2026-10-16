import { describe, it, expect } from 'vitest'
import { buildAttentionReference, localFocusSignal } from './attentionReference'

const row = (id, ms, count = 5) => ({ studentId: id, status: 'ready', history: Array.from({ length: count }, (_, day) => ({
  id: `${id}-${day}`, version: 2, mode: 'discover', startedAt: 1792152000000 - day * 86400000 - 120000,
  finishedAt: 1792152000000 - day * 86400000, activeMs: 120000, aborted: false, completionReason: 'completed',
  trials: Array.from({ length: 8 }, (_, i) => ({ at: 3000 + i * 10000, kind: 'go', outcome: 'hit', responseMs: ms })),
  summary: { hits: 8, misses: 0, wrong: 0, withheld: 0, early: 0, median: ms }
})) })

describe('FOKUS response-time colors', () => {
  const reference = buildAttentionReference(Array.from({ length: 8 }, (_, i) => row(`peer${i}`, 300)))
  it('keeps red/orange for repeatedly slow valid responses, with generous absolute and cohort gates', () => {
    expect(localFocusSignal(row('fast', 450), 'discover-go', reference).color).toBe('blue')
    expect(localFocusSignal(row('ordinary', 700), 'discover-go', reference).color).toBe('green')
    expect(localFocusSignal(row('slow', 1000, 3), 'discover-go', reference).color).toBe('orange')
    expect(localFocusSignal(row('slower', 1500), 'discover-go', reference).color).toBe('red')
    expect(localFocusSignal(row('short', 1500, 1), 'discover-go', reference).color).toBe('white')
    expect(localFocusSignal(row('no-peers', 1500), 'discover-go', null).color).toBe('yellow')
  })
  it('does not rank incomplete attempts or mix legacy two-second passes, and one slow day is insufficient', () => {
    const pupil = row('pupil', 300)
    pupil.history[0].trials.forEach(trial => { trial.responseMs = 1800 })
    pupil.history[0].summary.median = 1800
    expect(['red', 'orange']).not.toContain(localFocusSignal(pupil, 'discover-go', reference).color)
    pupil.history[0].aborted = true; pupil.history[0].completionReason = 'no_response'
    expect(localFocusSignal(pupil, 'discover-go', reference)).toMatchObject({ color: 'white', label: 'Ej fullföljt' })
    const old = row('old', 300)
    old.history.forEach(pass => { pass.version = 1; delete pass.trials; delete pass.completionReason })
    expect(localFocusSignal(old, 'discover-go', reference)).toMatchObject({ color: 'white', label: 'Äldre upplägg' })
  })
})
