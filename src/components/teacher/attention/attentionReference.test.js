import { describe, expect, it } from 'vitest'
import { buildAttentionReference, localFocusSignal } from './attentionReference'

const now = Date.UTC(2026, 9, 16, 12)
const row = (id, hits, count = 5, mode = 'choose') => ({ studentId: id, status: 'ready', history: Array.from({ length: count }, (_, day) => ({
  id: `${id}-${day}`, version: 1, mode, startedAt: now - day * 86400000 - 120000,
  finishedAt: now - day * 86400000, activeMs: 120000, aborted: false,
  summary: { hits, misses: 10 - hits, wrong: 0, withheld: 0, early: 0, median: hits ? 300 : null }
})) })
const peers = (rates = Array(8).fill(10)) => rates.map((hits, i) => row(`peer${i}`, hits))

describe('preliminary local attention reference', () => {
  it('requires eight other well-supported pupils and removes the pupil from their own reference', () => {
    const target = row('target', 0)
    expect(localFocusSignal(target, 'choose-go', buildAttentionReference([target, ...peers().slice(0, 7)]))).not.toHaveProperty('comparison')
    const signal = localFocusSignal(target, 'choose-go', buildAttentionReference([target, ...peers()]))
    expect(signal).toMatchObject({ color: 'red', comparison: { peers: 8, mean: 1, sd: 0, rate: 0, days: 5, total: 50 } })
  })
  it('weights each pupil equally regardless of pass count and is independent of the displayed group', () => {
    const cohort = peers([10, 10, 10, 10, 10, 10, 10, 6])
    cohort[7].history.push(...cohort[7].history.map(pass => ({ ...pass, id: `${pass.id}-copy` })))
    const target = row('target', 5)
    const reference = buildAttentionReference([target, ...cohort])
    const alone = localFocusSignal(target, 'choose-go', reference)
    const withOthers = [target, ...cohort].map(pupil => localFocusSignal(pupil, 'choose-go', reference))[0]
    expect(alone).toEqual(withOthers)
    expect(alone.comparison.mean).toBeCloseTo(.95)
  })
  it('never makes merely below-average performance red and applies large-gap and spread gates', () => {
    const reference = buildAttentionReference(peers())
    expect(localFocusSignal(row('slight', 9), 'choose-go', reference).color).toBe('green')
    expect(localFocusSignal(row('orange', 8), 'choose-go', reference).color).toBe('orange')
    expect(localFocusSignal(row('red', 7), 'choose-go', reference).color).toBe('red')
    const varied = buildAttentionReference(peers([10, 10, 10, 10, 0, 0, 0, 0]))
    expect(localFocusSignal(row('low', 0), 'choose-go', varied).color).toBe('yellow')
  })
  it('requires five repeated days and forty recent answers for red; one bad day is insufficient', () => {
    const reference = buildAttentionReference(peers())
    expect(localFocusSignal(row('short', 0, 3), 'choose-go', reference).color).toBe('orange')
    const singleBad = row('one-bad', 10)
    singleBad.history[0].summary = { hits: 0, misses: 10, wrong: 0, withheld: 0, early: 0, median: null }
    expect(localFocusSignal(singleBad, 'choose-go', reference).color).toBe('green')
    const fewAnswers = row('few', 0)
    fewAnswers.history.forEach(pass => { pass.summary.misses = 4 })
    expect(localFocusSignal(fewAnswers, 'choose-go', reference).color).toBe('orange')
  })
  it('does not mix modes, missing reads, aborted histories or pupils without enough days', () => {
    const target = row('target', 0)
    const cohort = [...peers().slice(0, 4), row('other', 10, 5, 'discover'), row('fewdays', 10, 1), { studentId: 'failed', status: 'error', history: [] }]
    const aborted = row('aborted', 10)
    aborted.history.forEach(pass => { pass.aborted = true })
    const reference = buildAttentionReference([...cohort, aborted])
    expect(reference['choose-go']).toHaveLength(4)
    expect(localFocusSignal(target, 'choose-go', reference)).not.toHaveProperty('comparison')
  })
  it('uses recent days and does not let older answers pad an insufficient recent window', () => {
    const target = row('target', 0, 10)
    target.history.slice(0, 5).forEach(pass => { pass.summary.misses = 4 })
    expect(localFocusSignal(target, 'choose-go', buildAttentionReference(peers())).color).toBe('orange')
    target.history.slice(0, 5).forEach(pass => { pass.summary.misses = 0 })
    // Zero-answer days are not informative; the older informative days remain
    // the latest comparable days and are labelled explicitly in the UI.
    expect(localFocusSignal(target, 'choose-go', buildAttentionReference(peers())).comparison.days).toBe(5)
  })
})
