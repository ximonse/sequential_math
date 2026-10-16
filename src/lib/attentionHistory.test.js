import { describe, it, expect } from 'vitest'
import { isValidAttentionResult, mergeAttentionHistory, recordAttentionResult } from './attentionHistory'
import { applyWalEntry, validEntry } from '../../api/student/[studentId]/events.js'
import { mergeProfiles } from '../../api/student/_profileMerge.js'

export const focusResult = (id = 'pass-1') => ({ id, version: 1, mode: 'choose', startedAt: 1000, finishedAt: 21000,
  activeMs: 20000, aborted: true, summary: { hits: 1, misses: 1, wrong: 0, withheld: 1, early: 0, median: 350 } })
describe('attention result persistence contract', () => {
  it('accepts version-2 five-second FOKUS results and validates completion reasons without weakening version 1', () => {
    const result = { ...focusResult(), version: 2, mode: 'discover', completionReason: 'no_response',
      trials: [{ at: 3000, kind: 'go', outcome: 'hit', responseMs: 4500 }],
      summary: { hits: 1, misses: 0, wrong: 0, withheld: 0, early: 0, median: 4500 } }
    expect(isValidAttentionResult(result)).toBe(true)
    expect(isValidAttentionResult({ ...result, activeMs: 15500.09999999999,
      trials: [{ ...result.trials[0], at: 3000.1 }] })).toBe(true)
    expect(validEntry({ id: 'v2-event', studentId: 'A', type: 'attention_result', payload: result }, 'A')).toBe(true)
    const profile = { problemLog: [], stats: {}, masteryFacts: { facts: [], revokedIds: [] } }
    applyWalEntry(profile, { id: 'v2-event', type: 'attention_result', payload: result })
    expect(profile.attentionHistory).toEqual([result])
    expect(mergeAttentionHistory([focusResult('old')], [result])).toHaveLength(2)
    for (const patch of [{ completionReason: 'completed' }, { completionReason: 'unknown' }, { mode: 'choose' }, { summary: null },
      { summary: { ...result.summary, median: 5000 } }, { summary: { ...result.summary, misses: 1 } },
      { trials: [] }, { trials: [{ ...result.trials[0], at: 19000 }] }, { trials: [{ ...result.trials[0], responseMs: -1 }] },
      { trials: [{ ...result.trials[0], kind: 'stop' }] }, { trials: null }]) {
      expect(isValidAttentionResult({ ...result, ...patch })).toBe(false)
    }
    expect(isValidAttentionResult({ ...result, aborted: false, activeMs: 120000, completionReason: 'completed' })).toBe(true)
  })
  it('accepts only consistent versioned summaries with bounded counters and timing', () => {
    expect(isValidAttentionResult(focusResult())).toBe(true)
    for (const patch of [{ version: 2 }, { activeMs: 120001 }, { mode: 'unknown' }, { aborted: false }, { finishedAt: 999 }, { id: '<script>' }]) {
      expect(isValidAttentionResult({ ...focusResult(), ...patch })).toBe(false)
    }
    for (const patch of [{ hits: -1 }, { median: 2500 }, { hits: 0 }, { extra: 1 }, { early: Infinity }]) {
      expect(isValidAttentionResult({ ...focusResult(), summary: { ...focusResult().summary, ...patch } })).toBe(false)
    }
  })
  it('validates MULTI totals, transition counts and missing response times', () => {
    const result = { ...focusResult(), mode: 'multi', summary: { total: 3, correct: 2, wrong: 0, missed: 1,
      repeat: { total: 1, correct: 1, median: 400 }, switch: { total: 1, correct: 0, median: null } } }
    expect(isValidAttentionResult(result)).toBe(true)
    expect(isValidAttentionResult({ ...result, summary: { ...result.summary, missed: 0 } })).toBe(false)
    expect(isValidAttentionResult({ ...result, summary: { ...result.summary, switch: { total: 2, correct: 0, median: null } } })).toBe(false)
  })
  it('validates event identity and applies retries without touching mathematical evidence', () => {
    const profile = { problemLog: [{ correct: true }], stats: { totalProblems: 1 }, masteryFacts: { facts: ['old'] }, adaptive: { level: 4 } }
    const before = structuredClone(profile)
    const event = { id: 'attention-pass-1', studentId: 'ELEV1', type: 'attention_result', payload: focusResult() }
    expect(validEntry(event, 'ELEV1')).toBe(true)
    expect(validEntry(event, 'ELEV2')).toBe(false)
    expect(applyWalEntry(profile, event)).toBe(true)
    expect(applyWalEntry(profile, { ...event, id: 'retry-event' })).toBe(false)
    expect(profile.attentionHistory).toHaveLength(1)
    const { attentionHistory, ...math } = profile
    expect(attentionHistory[0]).toEqual(focusResult())
    expect(math).toEqual(before)
  })
  it('unions independent passes, preserves immutable originals and handles older profiles', () => {
    const a = focusResult('a'), b = { ...focusResult('b'), finishedAt: 22000 }
    expect(mergeAttentionHistory([a], [b, { ...a, activeMs: 10 }])).toEqual([b, a])
    const merged = mergeProfiles({ studentId: 'ELEV1', attentionHistory: [a] }, { studentId: 'ELEV1', attentionHistory: [b] })
    expect(merged.attentionHistory).toEqual([b, a])
    expect(mergeProfiles({ studentId: 'ELEV1', attentionHistory: [a] }, { studentId: 'ELEV1' }).attentionHistory).toEqual([a])
    expect(recordAttentionResult({}, { ...a, version: 0 })).toBe(false)
  })
  it('retains the most recent 500 completed passes deterministically', () => {
    const results = Array.from({ length: 510 }, (_, i) => ({ ...focusResult(`pass-${i}`), finishedAt: 21000 + i }))
    const merged = mergeAttentionHistory([], results)
    expect(merged).toHaveLength(500)
    expect(merged[0].id).toBe('pass-509')
    expect(merged.at(-1).id).toBe('pass-10')
  })
})
