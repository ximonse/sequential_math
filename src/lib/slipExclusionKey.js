// Same key as api/_slipExclusions.js: practice answers by observation id,
// screening answers by attempt id. Other answers cannot be hidden.
export function slipExclusionKey(entry) {
  const reference = entry?.reference
  if (entry?.source === 'practice' && reference?.observationId) return `practice:${reference.observationId}`
  if (entry?.source === 'screening' && reference?.attemptId) return `screening:${reference.attemptId}`
  return null
}
