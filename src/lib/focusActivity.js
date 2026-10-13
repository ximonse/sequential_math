export const FOCUS_DURATION_MS = 120000
export const FOCUS_SIGNAL_MS = 2000
const PRACTICE_WAIT_MS = 1000
const FEEDBACK_MS = 1800

export function focusWaitMs(elapsed, random = Math.random) {
  const maximum = elapsed < 40000 ? 10000 : elapsed < 80000 ? 15000 : 20000
  return 3000 + random() * (maximum - 3000)
}

export function focusSignal(mode, random = Math.random) {
  if (mode === 'discover') return 'go'
  const value = random()
  return value < 0.7 ? 'go' : value < 0.85 ? 'red' : 'square'
}

// Ephemeral session model. No pupil profile or persistence dependencies.
export class FocusActivitySession {
  constructor({ now = () => performance.now(), random = Math.random } = {}) {
    this.now = now
    this.random = random
    this.mode = 'discover'
    this.phase = 'setup'
    this.elapsed = 0
    this.results = []
    this.early = 0
    this.practiceIndex = 0
    this.signal = null
    this.ackUntil = 0
  }

  practice(mode) {
    this.mode = mode
    this.phase = 'practice'
    this.practiceIndex = 0
    this.queue(this.now())
  }

  start() {
    this.phase = 'running'
    this.elapsed = 0
    this.segmentStart = this.now()
    this.results = []
    this.early = 0
    this.queue(this.segmentStart)
  }

  activeTime(now = this.now()) {
    return this.elapsed + (this.phase === 'running' ? now - this.segmentStart : 0)
  }

  queue(now) {
    this.signal = null
    this.outcome = null
    this.due = now + (this.phase === 'practice' ? PRACTICE_WAIT_MS : focusWaitMs(this.activeTime(now), this.random))
  }

  record(outcome, now) {
    this.outcome = outcome
    this.reactionMs = outcome === 'hit' ? now - this.signalStart : null
  }

  tick() {
    const now = this.now()
    if (this.phase === 'running' && this.activeTime(now) >= FOCUS_DURATION_MS) {
      this.finish(false)
      return
    }
    if (!['practice', 'running'].includes(this.phase) || now < this.due) return
    if (this.practiceFeedback) {
      this.practiceFeedback = null
      this.practiceIndex += 1
      if (this.practiceIndex === 3) { this.phase = 'ready'; return }
      this.queue(now)
    } else if (!this.signal) {
      this.signal = this.phase === 'practice'
        ? (this.mode === 'discover' ? 'go' : ['go', 'red', 'square'][this.practiceIndex])
        : focusSignal(this.mode, this.random)
      this.signalStart = now
      this.due = now + FOCUS_SIGNAL_MS
    } else {
      if (!this.outcome) this.record(this.signal === 'go' ? 'miss' : 'withheld', now)
      if (this.phase === 'running') this.results.push({ outcome: this.outcome, reactionMs: this.reactionMs })
      if (this.phase === 'practice') {
        this.practiceFeedback = { signal: this.signal, outcome: this.outcome }
        this.signal = null
        this.due = now + FEEDBACK_MS
      } else this.queue(now)
    }
  }

  press() {
    // Never create a not-yet-painted signal in response to a pupil's press.
    if (this.signal || (this.phase === 'running' && this.activeTime() >= FOCUS_DURATION_MS)) this.tick()
    if (!['practice', 'running'].includes(this.phase) || this.practiceFeedback || this.outcome) return
    const now = this.now()
    if (!this.signal) {
      if (this.phase === 'running') this.early += 1
    } else this.record(this.signal === 'go' ? 'hit' : 'wrong', now)
    this.ackUntil = now + 450
  }

  pause() {
    if (!['practice', 'running'].includes(this.phase)) return
    this.resumePhase = this.phase
    this.elapsed = this.activeTime()
    this.phase = 'paused'
    this.signal = null
    this.practiceFeedback = null
    this.ackUntil = 0
  }

  resume() {
    if (this.phase !== 'paused') return
    this.phase = this.resumePhase
    this.segmentStart = this.now()
    this.queue(this.segmentStart)
  }

  finish(aborted = true) {
    this.elapsed = Math.min(FOCUS_DURATION_MS, this.activeTime())
    this.phase = 'finished'
    this.aborted = aborted
    this.signal = null
    this.practiceFeedback = null
  }

  summary() {
    const count = outcome => this.results.filter(result => result.outcome === outcome).length
    const times = this.results.filter(result => result.outcome === 'hit').map(result => result.reactionMs).sort((a, b) => a - b)
    const middle = Math.floor(times.length / 2)
    return {
      hits: count('hit'), misses: count('miss'), wrong: count('wrong'), withheld: count('withheld'), early: this.early,
      median: times.length ? (times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2) : null
    }
  }
}
