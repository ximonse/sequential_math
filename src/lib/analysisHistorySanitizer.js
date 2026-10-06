const MAX_ATTEMPTS = 5000
const CODE = /^[a-z0-9_:-]{1,80}$/i
const MATH_TEXT = /^[0-9xyzXYZ+*/=().,\-\s÷×^%:]{1,80}$/
const CODE_FIELDS = [
  'domain', 'skill', 'contentSkill', 'operation', 'evidenceSkill', 'evidenceClass',
  'problemType', 'errorCategory', 'skillTag', 'selectionReason', 'difficultyBucket',
  'trainingMode', 'trainingPurpose', 'progressionMode', 'termOrder', 'partialCode',
  'speedExclusionReason'
]
const NUMBER_FIELDS = [
  'contentLevel', 'evidenceLevel', 'evidenceRuleVersion', 'level', 'answerLength',
  'timeSpent', 'speedTimeSec', 'hiddenDurationSec', 'blurCount',
  'personalMedianTimeSec', 'personalBaselineCount', 'difficulty', 'targetLevel',
  'abilityBefore', 'absError', 'relativeError', 'tolerance', 'carryCount', 'borrowCount'
]
const BOOLEAN_FIELDS = [
  'correct', 'isPartial', 'isInattentionError', 'isKnowledgeError',
  'excludedFromSpeed', 'interruptionSuspected', 'isReasonable', 'synthetic'
]

function mathValue(value, depth = 0) {
  if (depth > 4) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return MATH_TEXT.test(value) ? value : undefined
  if (Array.isArray(value)) return value.slice(0, 24).map(item => mathValue(item, depth + 1)).filter(item => item !== undefined)
  if (!value || typeof value !== 'object') return undefined
  const result = {}
  for (const [key, item] of Object.entries(value).slice(0, 32)) {
    if (!CODE.test(key) || /(?:id|name|pass|auth|token|secret|pin|student|class|school|email|username|login)/i.test(key)) continue
    const safe = mathValue(item, depth + 1)
    if (safe !== undefined) result[key] = safe
  }
  return result
}

export function safeAttempt(raw, timestamp) {
  if (!raw || typeof raw !== 'object' || raw.correct !== true && raw.correct !== false) return null
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  const row = { timestamp, correct: raw.correct }
  for (const key of CODE_FIELDS) {
    if (typeof raw[key] === 'string' && CODE.test(raw[key])) row[key] = raw[key]
  }
  for (const key of NUMBER_FIELDS) {
    if (raw[key] !== null && raw[key] !== '' && Number.isFinite(Number(raw[key]))) row[key] = Number(raw[key])
  }
  for (const key of BOOLEAN_FIELDS) {
    if (typeof raw[key] === 'boolean') row[key] = raw[key]
  }
  for (const key of ['correctAnswer', 'studentAnswer', 'result']) {
    const safe = mathValue(raw[key])
    if (safe !== undefined && (typeof safe === 'number' || typeof safe === 'string')) row[key] = safe
  }
  const values = mathValue(raw.values)
  if (values && typeof values === 'object') row.values = values
  if (Array.isArray(raw.patterns)) row.patterns = raw.patterns.filter(item => typeof item === 'string' && CODE.test(item)).slice(0, 10)
  if (Array.isArray(raw.trainingReasonCodes)) row.trainingReasonCodes = raw.trainingReasonCodes.filter(item => typeof item === 'string' && CODE.test(item)).slice(0, 10)
  return row
}

export function answerSource(profile) {
  const log = Array.isArray(profile?.problemLog) ? profile.problemLog : []
  const recent = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  if (log.length === 0) return recent
  const logLast = Math.max(...log.map(item => Number(item?.timestamp) || 0))
  const recentLast = Math.max(...recent.map(item => Number(item?.timestamp) || 0))
  return recentLast > logLast ? recent : log
}

// Analysis archives retain the real chronology. The localhost test export
// below still shifts dates, because it has a different purpose.
export function buildPupilTrainingStatistics(profile) {
  const source = answerSource(profile)
  if (source.length > MAX_ATTEMPTS) throw new Error('En elev har fler än 5 000 sparade svar.')
  const attempts = source.map(item => safeAttempt(item, Number(item?.timestamp))).filter(Boolean)
  const lifetime = Number(profile?.stats?.lifetimeProblems ?? profile?.stats?.totalProblems)
  const completions = (Array.isArray(profile?.tableDrill?.completions) ? profile.tableDrill.completions : [])
    .map(item => ({ table: Number(item?.table), timestamp: Number(item?.timestamp) }))
    .filter(item => Number.isInteger(item.table) && item.table >= 2 && item.table <= 12 && Number.isFinite(item.timestamp) && item.timestamp > 0)
  return { grade: Number.isInteger(Number(profile.grade)) ? Number(profile.grade) : null,
    currentDifficulty: Number.isFinite(profile.currentDifficulty) ? profile.currentDifficulty : null,
    highestDifficulty: Number.isFinite(profile.highestDifficulty) ? profile.highestDifficulty : null,
    historyComplete: Array.isArray(profile.problemLog) && (profile.problemLog.length > 0 || source.length === 0)
      && source.length < MAX_ATTEMPTS && Number.isFinite(lifetime) && lifetime <= source.length && attempts.length === source.length,
    attempts, completions }
}
