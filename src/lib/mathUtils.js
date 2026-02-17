const KNOWN_OPERATION_TYPES = new Set([
  'addition',
  'subtraction',
  'multiplication',
  'division'
])

export function inferOperationFromProblemType(problemType = '', options = {}) {
  const fallbackRaw = options?.fallback
  const fallback = typeof fallbackRaw === 'string' && fallbackRaw.trim() !== ''
    ? fallbackRaw.trim()
    : 'unknown'
  const allowUnknownPrefix = options?.allowUnknownPrefix !== false
  const normalized = String(problemType || '')

  if (normalized.startsWith('add_')) return 'addition'
  if (normalized.startsWith('sub_')) return 'subtraction'
  if (normalized.startsWith('mul_')) return 'multiplication'
  if (normalized.startsWith('div_')) return 'division'

  const [prefixRaw] = normalized.split('_')
  const prefix = String(prefixRaw || '').trim()
  if (!prefix) return fallback
  if (KNOWN_OPERATION_TYPES.has(prefix)) return prefix
  if (allowUnknownPrefix) return prefix
  return fallback
}

export function inferTableFromProblem(problem) {
  const skillTag = String(problem?.skillTag || '')
  const match = skillTag.match(/^mul_table_(\d{1,2})$/)
  if (match) {
    const n = Number(match[1])
    if (n >= 2 && n <= 12) return n
  }

  if (!String(problem?.problemType || '').startsWith('mul_')) return null
  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null
  if (a >= 2 && a <= 12 && b >= 1 && b <= 12) return a
  if (b >= 2 && b <= 12 && a >= 1 && a <= 12) return b
  return null
}

export function getSpeedTime(problem) {
  const speed = Number(problem?.speedTimeSec)
  if (Number.isFinite(speed) && speed > 0) return speed
  if (problem?.excludedFromSpeed) return null

  const raw = Number(problem?.timeSpent)
  if (Number.isFinite(raw) && raw > 0) return raw
  return null
}

export function median(values, options = {}) {
  const positiveOnly = options?.positiveOnly !== false
  const clean = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter(value => Number.isFinite(value) && (!positiveOnly || value > 0))
    .sort((a, b) => a - b)

  if (clean.length === 0) return null
  const middle = Math.floor(clean.length / 2)
  if (clean.length % 2 === 0) {
    return (clean[middle - 1] + clean[middle]) / 2
  }
  return clean[middle]
}
