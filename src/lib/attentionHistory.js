import { ATTENTION_PROTOCOLS } from './attentionProtocols.js'
export const MAX_ATTENTION_RESULTS = 500 // Profile cache only; the archive has no age/count expiry.
export const ATTENTION_LABELS = { discover: '1 - FOKUS', choose: '2 - KONTROLL', multi: 'MULTI' }
const count = value => Number.isInteger(value) && value >= 0 && value <= 1000
const median = value => value === null || (Number.isFinite(value) && value >= 0 && value <= 4000)
// Subtractions of performance timestamps can differ by a few floating-point bits.
const TIMING_EPSILON_MS = 0.01
const keysOnly = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))

export function isValidAttentionResult(result) {
  const modern = result?.version === 3
  const detailed = result?.version === 2 || modern
  const isNewFocus = detailed && result?.mode === 'discover'
  if (!keysOnly(result, ['id', 'version', 'mode', 'startedAt', 'finishedAt', 'activeMs', 'aborted', 'summary', ...(detailed ? ['completionReason', 'trials'] : []), ...(modern ? ['protocolId', 'protocol', 'events', 'stimuli'] : [])])) return false
  if (modern && (!ATTENTION_PROTOCOLS[result.protocolId] || ATTENTION_PROTOCOLS[result.protocolId].mode !== result.mode
    || !sameDefinition(result.protocol, ATTENTION_PROTOCOLS[result.protocolId]) || !validMeasurements(result))) return false
  if (typeof result.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(result.id) || (!detailed && result.version !== 1)
    || !Object.hasOwn(ATTENTION_LABELS, result.mode) || typeof result.aborted !== 'boolean'
    || !Number.isFinite(result.startedAt) || result.startedAt <= 0 || !Number.isFinite(result.finishedAt)
    || result.finishedAt < result.startedAt || !Number.isFinite(result.activeMs) || result.activeMs < 0
    || result.activeMs > 120000 || (!result.aborted && result.activeMs !== 120000)) return false
  const s = result.summary
  if (!s || typeof s !== 'object') return false
  if (detailed && (!['completed', 'ended', ...(modern ? ['unfinished'] : []), ...(isNewFocus ? ['no_response'] : [])].includes(result.completionReason)
    || result.aborted !== (result.completionReason !== 'completed')
    || (result.completionReason === 'no_response' && result.activeMs < 8000)
    || !validTrials(result))) return false
  if (isNewFocus && (s.misses !== 0 || s.wrong !== 0 || s.withheld !== 0)) return false
  if (result.mode !== 'multi') return keysOnly(s, ['hits', 'misses', 'wrong', 'withheld', 'early', 'median'])
    && ['hits', 'misses', 'wrong', 'withheld', 'early'].every(key => count(s[key]))
    && s.hits + s.misses + s.wrong + s.withheld <= 40
    && (isNewFocus ? s.median === null || (Number.isFinite(s.median) && s.median >= 0 && s.median < 5000) : median(s.median))
    && (s.hits === 0 ? s.median === null : s.median !== null && (isNewFocus || s.median <= 2000))
    && (result.mode !== 'discover' || s.withheld === 0)
  const group = g => keysOnly(g, ['total', 'correct', 'median']) && count(g.total) && count(g.correct)
    && g.correct <= g.total && median(g.median) && (g.correct === 0 ? g.median === null : g.median !== null)
  return keysOnly(s, ['total', 'correct', 'wrong', 'missed', 'repeat', 'switch'])
    && ['total', 'correct', 'wrong', 'missed'].every(key => count(s[key])) && s.total <= 200
    && s.correct + s.wrong + s.missed === s.total && group(s.repeat) && group(s.switch)
    && s.repeat.total + s.switch.total === Math.max(0, s.total - 1)
    && s.repeat.correct + s.switch.correct <= s.correct
    && s.correct - s.repeat.correct - s.switch.correct <= (s.total ? 1 : 0)
}

function validTrials(result) {
  const { trials, mode, activeMs, summary } = result
  if (!Array.isArray(trials) || trials.length > (mode === 'multi' ? 200 : 40)) return false
  const max = mode === 'discover' ? 5000 : mode === 'choose' ? 2000 : 4000
  let previousEnd = 0
  for (const trial of trials) {
    if (!keysOnly(trial, ['at', 'kind', 'outcome', 'responseMs']) || !Number.isFinite(trial.at)
      || trial.at < 0 || trial.at + TIMING_EPSILON_MS < previousEnd || !['hit', 'miss', 'wrong', 'withheld'].includes(trial.outcome)) return false
    const expectedKinds = mode === 'multi' ? ['first', 'repeat', 'switch'] : mode === 'choose' ? ['go', 'stop'] : ['go']
    if (!expectedKinds.includes(trial.kind)) return false
    const outcomes = mode === 'multi' ? ['hit', 'wrong', 'miss'] : trial.kind === 'stop' ? ['wrong', 'withheld'] : mode === 'discover' ? ['hit'] : ['hit', 'miss']
    if (!outcomes.includes(trial.outcome)) return false
    const answered = ['hit', 'wrong'].includes(trial.outcome)
    if (answered ? !Number.isFinite(trial.responseMs) || trial.responseMs < 0 || trial.responseMs >= max : trial.responseMs !== null) return false
    previousEnd = trial.at + (answered ? trial.responseMs : max)
    if (previousEnd > activeMs + TIMING_EPSILON_MS) return false
  }
  if (result.completionReason === 'no_response' && activeMs + TIMING_EPSILON_MS < previousEnd + 8000) return false
  const n = outcome => trials.filter(trial => trial.outcome === outcome).length
  const mid = values => {
    const sorted = values.sort((a, b) => a - b), index = Math.floor(sorted.length / 2)
    return sorted.length ? sorted.length % 2 ? sorted[index] : (sorted[index - 1] + sorted[index]) / 2 : null
  }
  if (mode !== 'multi') return summary.hits === n('hit') && summary.misses === n('miss')
    && summary.wrong === n('wrong') && summary.withheld === n('withheld')
    && summary.median === mid(trials.filter(trial => trial.outcome === 'hit').map(trial => trial.responseMs))
  if (trials.some((trial, i) => i === 0 ? trial.kind !== 'first' : trial.kind === 'first')) return false
  if (summary.total !== trials.length || summary.correct !== n('hit') || summary.wrong !== n('wrong') || summary.missed !== n('miss')) return false
  return ['repeat', 'switch'].every(kind => {
    const subset = trials.filter(trial => trial.kind === kind), correct = subset.filter(trial => trial.outcome === 'hit')
    return summary[kind]?.total === subset.length && summary[kind]?.correct === correct.length
      && summary[kind]?.median === mid(correct.map(trial => trial.responseMs))
  })
}

function sameDefinition(a, b) {
  if (a === b) return true
  return Boolean(a && b && typeof a === 'object' && typeof b === 'object'
    && Object.keys(a).length === Object.keys(b).length && Object.keys(b).every(key => Object.hasOwn(a, key) && sameDefinition(a[key], b[key])))
}

function validMeasurements(result) {
  const { events, stimuli, activeMs, mode } = result
  if (!Array.isArray(events) || events.length > 1500 || !Array.isArray(stimuli) || stimuli.length !== result.trials?.length) return false
  const types = ['start', 'signal', 'early', 'ignored', 'pause', 'resume', 'finish']
  let last = 0, wall = 0
  for (const event of events) {
    if (!keysOnly(event, ['at', 'wallMs', 'type', 'stimulus']) || !types.includes(event.type) || !Number.isFinite(event.at)
      || !Number.isFinite(event.wallMs) || event.wallMs < wall || event.wallMs < event.at - TIMING_EPSILON_MS
      || event.at < last || event.at > activeMs + TIMING_EPSILON_MS) return false
    if (event.type === 'signal') {
      const s = event.stimulus
      if (mode === 'multi' ? !keysOnly(s, ['shape', 'dots', 'rule']) || !['diamond', 'square'].includes(s.shape)
        || ![2, 3].includes(s.dots) || !['shape', 'count'].includes(s.rule)
        : !keysOnly(s, ['signal', 'waitMs']) || !['go', 'red', 'square'].includes(s.signal)
          || !Number.isFinite(s.waitMs) || s.waitMs < 4000 || s.waitMs > 17000) return false
    } else if (event.stimulus !== null) return false
    last = event.at
    wall = event.wallMs
  }
  return stimuli.every(stimulus => mode === 'multi'
    ? keysOnly(stimulus, ['shape', 'dots', 'rule', 'side', 'expectedSide'])
      && ['diamond', 'square'].includes(stimulus.shape) && [2, 3].includes(stimulus.dots)
      && ['shape', 'count'].includes(stimulus.rule) && [null, 'left', 'right'].includes(stimulus.side)
      && ['left', 'right'].includes(stimulus.expectedSide)
    : keysOnly(stimulus, ['signal', 'waitMs']) && ['go', 'red', 'square'].includes(stimulus.signal)
      && Number.isFinite(stimulus.waitMs) && stimulus.waitMs >= 4000 && stimulus.waitMs <= 17000)
}

export const isCurrentFocusResult = result => result.mode === 'discover' && result.version >= 2
export const isComparableAttentionPass = result => !result.aborted && (result.mode !== 'discover' || isCurrentFocusResult(result))
export const attentionCompletionLabel = result => result.completionReason === 'unfinished' ? 'Ej avslutat · senast sparat' : result.completionReason === 'no_response' ? 'Ej fullföljt' : result.aborted ? 'Avbrutet' : 'Klart'

// Immutable pass IDs make acknowledgements, retries and profile merges idempotent.
export function mergeAttentionHistory(existing = [], incoming = [], limit = MAX_ATTENTION_RESULTS) {
  const results = new Map()
  for (const result of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (isValidAttentionResult(result) && !results.has(result.id)) results.set(result.id, structuredClone(result))
  }
  return [...results.values()].sort((a, b) => b.finishedAt - a.finishedAt || a.id.localeCompare(b.id)).slice(0, limit)
}

export function recordAttentionResult(profile, result) {
  if (result?.completionReason === 'unfinished' || !isValidAttentionResult(result) || (Array.isArray(profile.attentionHistory) && profile.attentionHistory.some(item => item.id === result.id))) return false
  profile.attentionHistory = mergeAttentionHistory(profile.attentionHistory, [result])
  return true
}
