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
