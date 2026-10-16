import { describe, it, expect } from 'vitest'
import { attentionEndurance } from './attentionEndurance'
import { FocusActivitySession } from './focusActivity'
import { MultiActivitySession, multiAnswer } from './multiActivity'
import { isValidAttentionResult } from './attentionHistory'

const trial = (at, responseMs, kind = 'go', outcome = 'hit') => ({ at, responseMs, kind, outcome })
const pass = (trials, mode = 'discover') => ({ trials, mode, activeMs: 120000, completionReason: 'completed' })

describe('within-pass endurance evidence', () => {
  it('shows sustained slowing after a minute, not an inferred cause, and requires several samples', () => {
    const trials = [trial(4000, 300), trial(12000, 350), trial(22000, 400),
      trial(63000, 900), trial(73000, 950), trial(94000, 1000), trial(105000, 1100)]
    expect(attentionEndurance(pass(trials)).series[0].slowerFrom).toBe(60000)
    expect(attentionEndurance(pass(trials.slice(1))).series[0].slowerFrom).toBeNull()
    expect(attentionEndurance(pass(trials.slice(0, -2))).series[0].slowerFrom).toBeNull()
    expect(attentionEndurance({ mode: 'discover' })).toBeNull()
  })
  it('keeps MULTI repeat and switch separate; more switches do not imply declining endurance', () => {
    const trials = [trial(1000, 300, 'first'), ...[4000, 12000, 22000].map(at => trial(at, 300, 'repeat')),
      ...[62000, 72000, 92000, 102000].map(at => trial(at, 1200, 'switch'))]
    expect(attentionEndurance(pass(trials, 'multi')).series.every(series => series.slowerFrom === null)).toBe(true)
  })
  it('marks no-response onset and keeps intentional withholding separate from missed responses', () => {
    expect(attentionEndurance({ ...pass([]), activeMs: 67000, completionReason: 'no_response' }).unansweredFrom).toBe(62000)
    const trials = [trial(3000, null, 'stop', 'withheld'), trial(9000, null, 'stop', 'withheld')]
    expect(attentionEndurance(pass(trials, 'choose')).unansweredFrom).toBeNull()
    trials.push(trial(40000, null, 'go', 'miss'), trial(50000, null, 'go', 'miss'))
    expect(attentionEndurance(pass(trials, 'choose')).unansweredFrom).toBe(40000)
  })
  it('records active signal times across a hidden interval, discards unfinished trials, and persists all three modes', () => {
    for (const mode of ['discover', 'choose', 'multi']) {
      let now = 0
      const session = mode === 'multi' ? new MultiActivitySession({ now: () => now, random: () => 0 }) : new FocusActivitySession({ now: () => now, random: () => 0 })
      session.mode = mode; session.start()
      now = session.due; session.tick()
      now += 250
      mode === 'multi' ? session.press(multiAnswer(session.trial)) : session.press()
      session.pause(); now += 100000; session.resume()
      now = session.due; session.tick()
      session.finish()
      const result = { id: mode, version: 2, mode, startedAt: 1000, finishedAt: 200000,
        activeMs: session.elapsed, aborted: true, completionReason: 'ended', summary: session.summary(), trials: session.trace() }
      expect(result.trials).toHaveLength(1)
      expect(result.trials[0]).toMatchObject({ at: mode === 'multi' ? 600 : 3000, responseMs: 250 })
      expect(isValidAttentionResult(result)).toBe(true)
      expect(isValidAttentionResult({ ...result, trials: [...result.trials, ...result.trials] })).toBe(false)
      if (mode === 'choose') expect(isValidAttentionResult({ ...result,
        summary: { ...result.summary, hits: 0, wrong: 1, median: null },
        trials: [{ ...result.trials[0], kind: 'go', outcome: 'wrong' }] })).toBe(false)
    }
  })
})
