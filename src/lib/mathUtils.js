const KNOWN_OPERATION_TYPES = new Set([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'algebra_evaluate',
  'algebra_simplify',
  'arithmetic_expressions',
  'fractions',
  'percentage'
])

export function isKnownOperationType(value) {
  return KNOWN_OPERATION_TYPES.has(String(value || '').trim())
}

function normalizeExplicitOperation(value, allowUnknown = false) {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  if (isKnownOperationType(normalized)) return normalized
  return allowUnknown ? normalized : ''
}

function normalizeOperationFallback(options, defaultValue = 'unknown') {
  if (!options || !Object.prototype.hasOwnProperty.call(options, 'fallback')) {
    return defaultValue
  }
  if (options.fallback === null) return null
  if (options.fallback === undefined) return defaultValue
  return String(options.fallback).trim()
}

export function inferOperationFromProblemType(problemType = '', options = {}) {
  const fallback = normalizeOperationFallback(options)
  const allowUnknownPrefix = options?.allowUnknownPrefix !== false
  const normalized = String(problemType || '')

  if (normalized.startsWith('add_')) return 'addition'
  if (normalized.startsWith('sub_')) return 'subtraction'
  if (normalized.startsWith('mul_')) return 'multiplication'
  if (normalized.startsWith('div_')) return 'division'
  if (normalized === 'algebra_evaluate') return 'algebra_evaluate'
  if (normalized === 'algebra_simplify') return 'algebra_simplify'
  if (normalized === 'arithmetic_expressions') return 'arithmetic_expressions'
  if (normalized === 'fractions') return 'fractions'
  if (normalized === 'percentage') return 'percentage'
  if (normalized.startsWith('alg_')) return normalized

  const [prefixRaw] = normalized.split('_')
  const prefix = String(prefixRaw || '').trim()
  if (!prefix) return fallback
  if (KNOWN_OPERATION_TYPES.has(prefix)) return prefix
  if (allowUnknownPrefix) return prefix
  return fallback
}

export function resolveProblemOperation(problem, options = {}) {
  const fallback = normalizeOperationFallback(options)
  const allowUnknownOperation = options?.allowUnknownOperation === true
  const allowUnknownPrefix = options?.allowUnknownPrefix === true

  const direct = normalizeExplicitOperation(problem?.operation, allowUnknownOperation)
  if (direct) return direct

  const skill = normalizeExplicitOperation(problem?.skill, allowUnknownOperation)
  if (skill) return skill

  const type = normalizeExplicitOperation(problem?.type, allowUnknownOperation)
  if (type) return type

  const storedType = String(problem?.problemType || problem?.template || '').trim()
  if (storedType) {
    const inferred = inferOperationFromProblemType(storedType, {
      fallback: '',
      allowUnknownPrefix
    })
    if (inferred && (allowUnknownOperation || isKnownOperationType(inferred))) return inferred
  }

  const domain = normalizeExplicitOperation(problem?.domain, allowUnknownOperation)
  if (domain) return domain

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
