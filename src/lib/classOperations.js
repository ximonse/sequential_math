import { ALL_OPERATIONS, STANDARD_OPERATIONS } from './operations.js'

const knownOperations = new Set(ALL_OPERATIONS)

export function normalizeClassOperations(values) {
  if (!Array.isArray(values)) return []
  return [...new Set(values.map(value => String(value || '').trim()))]
    .filter(value => knownOperations.has(value))
}

export function resolveClassOperations(classRecord) {
  if (Array.isArray(classRecord?.enabledOperations)) {
    return normalizeClassOperations(classRecord.enabledOperations)
  }
  return normalizeClassOperations([
    ...STANDARD_OPERATIONS,
    ...(Array.isArray(classRecord?.enabledExtras) ? classRecord.enabledExtras : [])
  ])
}

export function classOperationsAreValid(values) {
  return Array.isArray(values)
    && values.length > 0
    && normalizeClassOperations(values).length === values.length
}
