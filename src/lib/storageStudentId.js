export function normalizeStudentId(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const normalized = raw
    .normalize('NFC')
    .replace(/[^a-zA-Z0-9ÅÄÖåäö_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  return normalized.toUpperCase()
}

function normalizeStudentIdLegacy(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const ascii = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  return ascii.toUpperCase()
}

export function getStudentIdCandidates(value) {
  const primary = normalizeStudentId(value)
  const legacy = normalizeStudentIdLegacy(value)
  const candidates = []
  if (primary) candidates.push(primary)
  if (legacy && legacy !== primary) candidates.push(legacy)
  return candidates
}
