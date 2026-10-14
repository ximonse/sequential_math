export const MAX_ATTENTION_RESULTS = 500
export const ATTENTION_LABELS = { discover: '1 - FOKUS', choose: '2 - KONTROLL', multi: 'MULTI' }
const count = value => Number.isInteger(value) && value >= 0 && value <= 1000
const median = value => value === null || (Number.isFinite(value) && value >= 0 && value <= 4000)
const keysOnly = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))

export function isValidAttentionResult(result) {
  if (!keysOnly(result, ['id', 'version', 'mode', 'startedAt', 'finishedAt', 'activeMs', 'aborted', 'summary'])) return false
  if (typeof result.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(result.id) || result.version !== 1
    || !Object.hasOwn(ATTENTION_LABELS, result.mode) || typeof result.aborted !== 'boolean'
    || !Number.isFinite(result.startedAt) || result.startedAt <= 0 || !Number.isFinite(result.finishedAt)
    || result.finishedAt < result.startedAt || !Number.isFinite(result.activeMs) || result.activeMs < 0
    || result.activeMs > 120000 || (!result.aborted && result.activeMs !== 120000)) return false
  const s = result.summary
  if (result.mode !== 'multi') return keysOnly(s, ['hits', 'misses', 'wrong', 'withheld', 'early', 'median'])
    && ['hits', 'misses', 'wrong', 'withheld', 'early'].every(key => count(s[key]))
    && s.hits + s.misses + s.wrong + s.withheld <= 40 && median(s.median)
    && (s.hits === 0 ? s.median === null : s.median !== null && s.median <= 2000)
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

// Immutable pass IDs make acknowledgements, retries and profile merges idempotent.
export function mergeAttentionHistory(existing = [], incoming = []) {
  const results = new Map()
  for (const result of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    if (isValidAttentionResult(result) && !results.has(result.id)) results.set(result.id, structuredClone(result))
  }
  return [...results.values()].sort((a, b) => b.finishedAt - a.finishedAt || a.id.localeCompare(b.id)).slice(0, MAX_ATTENTION_RESULTS)
}

export function recordAttentionResult(profile, result) {
  if (!isValidAttentionResult(result) || (Array.isArray(profile.attentionHistory) && profile.attentionHistory.some(item => item.id === result.id))) return false
  profile.attentionHistory = mergeAttentionHistory(profile.attentionHistory, [result])
  return true
}
