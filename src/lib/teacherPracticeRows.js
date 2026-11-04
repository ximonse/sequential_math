import { teacherPracticeHistory } from './teacherPracticeHistory.js'

const pick = (value, keys) => Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]))

const fields = ['observationId', 'problemId', 'classIdAtAttempt', 'domain', 'skill', 'operation',
  'contentSkill', 'contentLevel', 'evidenceSkill', 'evidenceLevel', 'evidenceClass', 'evidenceRuleVersion',
  'problemType', 'promptText', 'values', 'studentAnswer', 'correctAnswer', 'correct', 'isPartial',
  'partialCode', 'partialDetail', 'level', 'targetLevel', 'timestamp', 'errorCategory', 'errorPatterns',
  'patterns', 'errorDetail', 'timeSpent', 'speedTimeSec', 'excludedFromSpeed', 'speedExclusionReason',
  'interruptionSuspected', 'trainingMode', 'trainingPurpose']
const contextFields = ['version', 'frameId', 'mode', 'source', 'assignmentId', 'assignmentKind',
  'allowedSkills', 'levelRange', 'tableSet', 'progressionMode']

// Canonical teacher read: deduplicate only identical projected records with a
// stable observation ID. Conflicts and unidentified legacy rows remain visible.
export function teacherPracticeRows(profile) {
  const { source, entries: log } = teacherPracticeHistory(profile)
  const warnings = new Set(['history_completeness_unknown'])
  if (source === 'recentProblems') warnings.add('recent_problems_fallback')
  const seen = new Map(), entries = []
  let duplicates = 0, invalidTimestamps = 0
  for (const [position, raw] of log.entries()) {
    if (!raw || typeof raw !== 'object') { invalidTimestamps++; continue }
    const value = pick(raw, fields)
    if (raw.trainingContext) value.trainingContext = pick(raw.trainingContext, contextFields)
    if (!Number.isFinite(value.timestamp) || value.timestamp <= 0) { invalidTimestamps++; continue }
    const id = typeof value.observationId === 'string' && value.observationId.trim() ? value.observationId : null
    const fingerprint = JSON.stringify(value)
    if (id && seen.has(id)) {
      if (seen.get(id).has(fingerprint)) { duplicates++; continue }
      warnings.add('conflicting_observation_ids')
      seen.get(id).add(fingerprint)
    } else if (id) seen.set(id, new Set([fingerprint]))
    entries.push({ raw, value, id, position })
  }
  return { source, entries, storedRecords: log.length, duplicates, invalidTimestamps, warnings: [...warnings] }
}
