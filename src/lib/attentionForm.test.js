import { describe, expect, it } from 'vitest'
import { attentionMetric, attentionComparison, latestToday, focusDate } from './attentionForm'
const now = Date.parse('2026-10-18T12:00:00Z')
const pass = (day = 0, ms = 400) => ({ id: `${day}-${ms}`, version: 2, mode: 'discover',
  startedAt: now - day * 86400000, finishedAt: now - day * 86400000 + 120000, activeMs: 120000, aborted: false,
  trials: [4000, 12000, 23000, 35000, 84000, 100000].map(at => ({ at, kind: 'go', outcome: 'hit', responseMs: ms })), summary: { median: ms } })
const row = (id, ms = 400) => ({ studentId: id, history: [0, 1, 2, 3, 4, 5].map(day => pass(day, ms)) })
describe('attention form comparisons', () => {
  it('uses Stockholm dates, latest attempt today and never silently replaces a failed attempt with a successful one', () => {
    expect(focusDate(Date.parse('2026-10-18T22:30:00Z'))).toBe('2026-10-19')
    const pupil = row('A'); pupil.history.push({ ...pass(), id: 'abort', startedAt: now + 10, aborted: true })
    expect(latestToday(pupil, 'discover', now + 20).id).toBe('abort')
    expect(attentionMetric(pupil.history.at(-1), 'speed')).toBeNull()
  })
  it('excludes today, the pupil and incompatible protocols; gives every peer equal weight', () => {
    const pupil = row('A', 1200), peers = Array.from({ length: 8 }, (_, i) => row(`B${i}`))
    peers[0].history.push(...Array.from({ length: 50 }, () => pass(1)))
    const result = attentionComparison(pupil, pass(0, 1200), 'speed', [pupil, ...peers], 'class', now)
    expect(result).toMatchObject({ peers: 8, center: 400, color: 'orange' })
    peers[0].history = peers[0].history.map(p => ({ ...p, protocolId: 'different' }))
    expect(attentionComparison(pupil, pass(0, 1200), 'speed', peers, 'class', now).score).toBeNull()
    expect(attentionComparison(pupil, pass(0, 1500), 'speed', [pupil], 'own', now).center).toBe(1200)
  })
  it('does not mark a single low day red or orange and leaves missing endurance unknown', () => {
    const pupil = row('A'), peers = Array.from({ length: 8 }, (_, i) => row(`B${i}`))
    expect(attentionComparison(pupil, pass(0, 1800), 'speed', peers, 'class', now).color).toBe('yellow')
    expect(attentionMetric(pass(), 'endurance')).toBe(1)
    expect(attentionMetric({ ...pass(), trials: pass().trials.slice(0, 4) }, 'endurance')).toBeNull()
    const slow = row('A', 1800)
    expect(attentionComparison(slow, pass(0, 1800), 'speed', peers, 'class', now).color).toBe('red')
  })
})
