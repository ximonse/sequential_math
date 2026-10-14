import { shuffled } from './attentionActivityUtils'

export const MULTI_DURATION_MS = 120000
export const MULTI_RESPONSE_MS = 4000
const WAIT_MS = 600
const PRACTICE_FEEDBACK_MS = 1200
const FEEDBACK_MS = 500
export const MULTI_CORRECTION_MS = 1800
const DOUBLE_PRESS_MS = 400

export function multiAnswer(trial) {
  return trial.rule === 'shape'
    ? (trial.shape === 'diamond' ? 'left' : 'right')
    : (trial.dots === 2 ? 'left' : 'right')
}

const VARIANTS = [
  { shape: 'diamond', dots: 2 }, { shape: 'square', dots: 2 },
  { shape: 'diamond', dots: 3 }, { shape: 'square', dots: 3 }
]

export function multiPracticeTrials() {
  return [
    ...VARIANTS.map(trial => ({ ...trial, rule: 'shape' })),
    ...VARIANTS.map(trial => ({ ...trial, rule: 'count' })),
    ...['shape', 'count', 'count', 'shape', 'count', 'shape', 'shape', 'count']
      .map((rule, index) => ({ ...VARIANTS[index % 4], rule }))
  ]
}

export function multiPassTrials(random = Math.random) {
  const block = ['shape', 'count'].flatMap(rule => VARIANTS.map(trial => ({ ...trial, rule })))
  // Begin with repeats and a switch; the rest is balanced across both rules and all figures.
  const intro = [block[0], block[3], block[6], block[5]]
  return [...intro, ...shuffled([...block, ...block, ...block,
    block[1], block[2], block[4], block[7]], random)]
}

export class MultiActivitySession {
  constructor({ now = () => performance.now(), random = Math.random } = {}) {
    this.now = now
    this.random = random
    this.phase = 'setup'
    this.results = []
    this.elapsed = 0
    this.trialIndex = 0
    this.trial = null
    this.feedback = null
    this.previousRule = null
    this.ignorePressUntil = 0
  }

  practice() {
    this.phase = 'practice'
    this.trials = multiPracticeTrials()
    this.trialIndex = 0
    this.queue()
  }

  start() {
    this.hasStarted = true
    this.phase = 'running'
    this.trials = multiPassTrials(this.random)
    this.trialIndex = 0
    this.results = []
    this.previousRule = null
    this.elapsed = 0
    this.segmentStart = this.now()
    this.queue()
  }

  activeTime(now = this.now()) {
    return this.elapsed + (this.phase === 'running' ? now - this.segmentStart : 0)
  }

  queue() {
    this.trial = null
    this.feedback = null
    this.due = this.now() + WAIT_MS
  }

  complete(side = null) {
    const trial = this.trial
    const expectedSide = multiAnswer(trial)
    const result = {
      ...trial, side, expectedSide, correct: side === expectedSide,
      timeout: side === null, responseMs: side === null ? null : this.now() - this.trialStart,
      transition: this.previousRule === null ? 'first' : this.previousRule === trial.rule ? 'repeat' : 'switch'
    }
    if (this.phase === 'running') {
      this.results.push(result)
      this.previousRule = trial.rule
    }
    this.feedback = result
    this.trial = null
    const feedbackMs = !result.correct && !result.timeout ? MULTI_CORRECTION_MS
      : this.phase === 'practice' ? PRACTICE_FEEDBACK_MS : result.timeout ? MULTI_CORRECTION_MS : FEEDBACK_MS
    this.due = this.now() + feedbackMs
  }

  tick() {
    if (this.phase === 'running' && this.activeTime() >= MULTI_DURATION_MS) { this.finish(false); return }
    if (!['practice', 'running'].includes(this.phase) || this.now() < this.due) return
    if (this.feedback) {
      this.trialIndex += 1
      if (this.trialIndex === this.trials.length) {
        if (this.phase === 'practice') { this.phase = 'ready'; this.feedback = null; return }
        this.trials = multiPassTrials(this.random)
        this.trialIndex = 0
      }
      this.queue()
    } else if (this.trial) this.complete()
    else {
      this.trial = this.trials[this.trialIndex]
      this.trialStart = this.now()
      this.due = this.now() + MULTI_RESPONSE_MS
    }
  }

  press(side) {
    if (!['left', 'right'].includes(side) || !['practice', 'running'].includes(this.phase)) return
    if ((this.trial && this.now() >= this.due) || (this.phase === 'running' && this.activeTime() >= MULTI_DURATION_MS)) this.tick()
    if (!this.trial || this.now() < this.ignorePressUntil) return
    this.ignorePressUntil = this.now() + DOUBLE_PRESS_MS
    this.complete(side)
  }

  pause() {
    if (!['practice', 'running'].includes(this.phase)) return
    this.resumePhase = this.phase
    this.elapsed = this.activeTime()
    // A finished trial remains finished, even if the app is hidden during its feedback.
    if (this.feedback) this.trialIndex += 1
    this.trial = null
    this.feedback = null
    this.phase = 'paused'
  }

  resume() {
    if (this.phase !== 'paused') return
    this.phase = this.resumePhase
    if (this.trialIndex === this.trials.length) {
      if (this.phase === 'practice') { this.phase = 'ready'; return }
      this.trials = multiPassTrials(this.random)
      this.trialIndex = 0
    }
    this.segmentStart = this.now()
    this.queue()
  }

  finish(aborted = true) {
    this.elapsed = Math.min(MULTI_DURATION_MS, this.activeTime())
    this.phase = 'finished'
    this.aborted = aborted
    this.trial = null
    this.feedback = null
  }

  summary() {
    const group = transition => {
      const trials = this.results.filter(result => result.transition === transition)
      const times = trials.filter(result => result.correct).map(result => result.responseMs).sort((a, b) => a - b)
      const middle = Math.floor(times.length / 2)
      return { total: trials.length, correct: trials.filter(result => result.correct).length,
        median: times.length ? (times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2) : null }
    }
    return {
      total: this.results.length, correct: this.results.filter(result => result.correct).length,
      wrong: this.results.filter(result => !result.correct && !result.timeout).length,
      missed: this.results.filter(result => result.timeout).length,
      repeat: group('repeat'), switch: group('switch')
    }
  }
}
