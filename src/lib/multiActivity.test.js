import { describe, expect, it } from 'vitest'
import { MultiActivitySession, multiAnswer, multiPassTrials, multiPracticeTrials } from './multiActivity'

function fixture() {
  let time = 0
  const session = new MultiActivitySession({ now: () => time, random: () => 0 })
  return { session, advance: ms => { time += ms; session.tick() } }
}

describe('MULTI', () => {
  it('uses form at the top and count at the bottom, including conflicting cues', () => {
    expect(multiAnswer({ rule: 'shape', shape: 'diamond', dots: 3 })).toBe('left')
    expect(multiAnswer({ rule: 'count', shape: 'diamond', dots: 3 })).toBe('right')
    expect(multiAnswer({ rule: 'shape', shape: 'square', dots: 2 })).toBe('right')
    expect(multiAnswer({ rule: 'count', shape: 'square', dots: 2 })).toBe('left')
  })
  it('introduces four form, four count and eight mixed trials with all figure combinations', () => {
    const practice = multiPracticeTrials()
    expect(practice).toHaveLength(16)
    expect(practice.slice(0, 4).every(trial => trial.rule === 'shape')).toBe(true)
    expect(practice.slice(4, 8).every(trial => trial.rule === 'count')).toBe(true)
    expect(new Set(practice.slice(8).map(trial => trial.rule)).size).toBe(2)
    expect(new Set(practice.slice(0, 4).map(trial => `${trial.shape}:${trial.dots}`)).size).toBe(4)
  })
  it('balances all combinations and includes switches and repeats regardless of random source', () => {
    for (const random of [() => 0, () => 0.999]) {
      const trials = multiPassTrials(random)
      expect(trials).toHaveLength(32)
      for (const rule of ['shape', 'count']) for (const shape of ['diamond', 'square']) for (const dots of [2, 3]) {
        expect(trials.filter(trial => trial.rule === rule && trial.shape === shape && trial.dots === dots)).toHaveLength(4)
      }
      expect(trials[0].rule).toBe(trials[1].rule)
      expect(trials[1].rule).not.toBe(trials[2].rule)
    }
  })
  it('keeps practice results separate and requires all sixteen trials', () => {
    const { session, advance } = fixture()
    session.practice()
    for (let i = 0; i < 16; i++) {
      advance(600)
      session.press(multiAnswer(session.trial))
      advance(1200)
    }
    expect(session.phase).toBe('ready')
    expect(session.summary().total).toBe(0)
  })
  it('records actual rule transitions and excludes the first trial from both comparisons', () => {
    const { session, advance } = fixture()
    session.start()
    for (let i = 0; i < 4; i++) {
      advance(600); advance(250)
      session.press(multiAnswer(session.trial))
      session.press('right')
      advance(500)
    }
    expect(session.summary()).toMatchObject({ total: 4, correct: 4, wrong: 0,
      repeat: { total: 2, correct: 2, median: 250 }, switch: { total: 1, correct: 1, median: 250 } })
  })
  it('counts wrong answers and timeouts without a punishment delay', () => {
    const { session, advance } = fixture()
    session.start(); advance(600); session.press('right'); advance(500)
    advance(600); advance(4000)
    expect(session.summary()).toMatchObject({ wrong: 1, missed: 1, total: 2 })
  })
  it('freezes the clock and replays an unanswered trial without inventing results', () => {
    const { session, advance } = fixture()
    session.start(); advance(600)
    const trial = session.trial
    session.pause(); advance(300000)
    expect(session.activeTime()).toBe(600)
    session.resume(); advance(600)
    expect(session.trial).toEqual(trial)
    expect(session.summary().total).toBe(0)
  })
  it('keeps completed trials when pausing during feedback and does not repeat them', () => {
    const { session, advance } = fixture()
    session.start(); advance(600); session.press('left'); session.pause(); session.resume(); advance(600)
    expect(session.summary().total).toBe(1)
    expect(session.trial.shape).toBe('square')
  })
  it('finishes after 120 active seconds and discards the unfinished trial', () => {
    const { session, advance } = fixture()
    session.start(); advance(119000); advance(1000)
    expect(session.phase).toBe('finished')
    expect(session.aborted).toBe(false)
    expect(session.summary().total).toBe(0)
  })
})
