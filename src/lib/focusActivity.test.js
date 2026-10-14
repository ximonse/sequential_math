import { describe, expect, it } from 'vitest'
import { FocusActivitySession, focusSignal, focusWaitMs } from './focusActivity'

function fixture(random = () => 0) {
  let time = 0
  const session = new FocusActivitySession({ now: () => time, random })
  return { session, advance: ms => { time += ms; session.tick() }, set: value => { time = value; session.tick() } }
}

describe('focus activity', () => {
  it('mixes wait intervals within the three progressive ranges', () => {
    for (const [elapsed, max] of [[0, 10000], [39999, 10000], [40000, 15000], [80000, 20000]]) {
      expect(focusWaitMs(elapsed, () => 0)).toBe(3000)
      expect(focusWaitMs(elapsed, () => 1)).toBe(max)
    }
  })
  it('selects the intended 70/15/15 signals and always green for discover', () => {
    expect(focusSignal('choose', () => 0.699)).toBe('go')
    expect(focusSignal('choose', () => 0.7)).toBe('red')
    expect(focusSignal('choose', () => 0.85)).toBe('square')
    expect(focusSignal('discover', () => 0.99)).toBe('go')
  })
  it('requires three practice signals before offering the real pass and keeps their results separate', () => {
    const { session, advance } = fixture()
    session.practice('choose')
    for (const signal of ['go', 'red', 'square']) {
      advance(1000)
      expect(session.signal).toBe(signal)
      if (signal === 'go') session.press()
      else advance(2000)
      expect(session.practiceFeedback.outcome).toBe(signal === 'go' ? 'hit' : 'withheld')
      advance(1800)
    }
    expect(session.phase).toBe('ready')
    expect(session.summary().hits).toBe(0)
    session.start()
    expect(session.activeTime()).toBe(0)
    expect(session.due - session.now()).toBe(3000)
  })
  it('counts early presses without changing the wait deadline, and ignores repeated signal presses', () => {
    const { session, advance } = fixture()
    session.start()
    const due = session.due
    session.press(); session.press()
    expect(session.early).toBe(1)
    advance(400); session.press()
    expect(session.early).toBe(2)
    expect(session.due).toBe(due)
    advance(2600); advance(220)
    session.press(); session.press()
    expect(session.signal).toBe(null)
    expect(session.due - session.now()).toBe(3000)
    expect(session.summary()).toMatchObject({ hits: 1, wrong: 0, median: 220, early: 2 })
  })
  it('counts missed and withheld signals separately from wrong presses', () => {
    const { session, advance } = fixture(() => 0.8)
    session.mode = 'choose'; session.start()
    for (let i = 0; i < 3; i++) {
      advance(session.due - session.now())
      if (session.signal === 'square') session.press()
      else advance(2000)
    }
    expect(session.summary()).toMatchObject({ withheld: 1, wrong: 1, misses: 1 })
  })
  it('keeps completed presses, excludes unanswered paused signals and freezes time', () => {
    const { session, advance } = fixture()
    session.start(); advance(3000); advance(100); session.press(); session.pause()
    advance(300000)
    expect(session.phase).toBe('paused')
    expect(session.activeTime()).toBe(3100)
    expect(session.summary().hits).toBe(1)
    session.resume()
    expect(session.signal).toBe(null)
    expect(session.due - session.now()).toBe(3000)
    advance(3000)
    expect(session.activeTime()).toBe(6100)
  })
  it('finishes at 120 active seconds and discards unfinished signals, including on abort', () => {
    const { session, set } = fixture()
    session.start(); set(119000); set(120000)
    expect(session.phase).toBe('finished')
    expect(session.aborted).toBe(false)
    expect(session.summary().hits).toBe(0)
    const other = fixture()
    other.session.start(); other.advance(3000); other.session.press(); other.session.finish()
    expect(other.session.aborted).toBe(true)
    expect(other.session.summary().hits).toBe(1)
  })
  it('does not turn a late-rendered waiting point green as a consequence of pressing', () => {
    let now = 0
    const session = new FocusActivitySession({ now: () => now, random: () => 0 })
    session.start(); now = 3100; session.press()
    expect(session.signal).toBe(null)
    expect(session.early).toBe(1)
  })
  it('immediately completes both go and no-go presses and ignores their quick second taps', () => {
    for (const [mode, random, outcome] of [['discover', () => 0, 'hits'], ['choose', () => 0.8, 'wrong']]) {
      const { session, advance } = fixture(random)
      session.mode = mode; session.start()
      advance(session.due)
      if (mode === 'choose' && session.signal === 'go') {
        advance(2000)
        advance(session.due - session.now())
      }
      session.press()
      expect(session.signal).toBe(null)
      expect(session.summary()[outcome]).toBe(1)
      const due = session.due
      advance(120); session.press()
      expect(session.early).toBe(0)
      expect(session.due).toBe(due)
      advance(280); session.press()
      expect(session.early).toBe(1)
      expect(session.summary()[outcome]).toBe(1)
    }
  })
  it('guarantees all three control signals in the pass even with an always-green random source', () => {
    const { session, advance } = fixture()
    session.mode = 'choose'; session.start()
    const seen = []
    for (let i = 0; i < 3; i++) {
      advance(session.due - session.now())
      seen.push(session.signal)
      advance(2000)
    }
    expect(seen.sort()).toEqual(['go', 'red', 'square'])
  })
  it('replays an unfinished guaranteed control signal after hiding the page', () => {
    const { session, advance } = fixture()
    session.mode = 'choose'; session.start(); advance(session.due)
    const signal = session.signal
    session.pause(); advance(20000); session.resume()
    advance(session.due - session.now())
    expect(session.signal).toBe(signal)
  })
})
