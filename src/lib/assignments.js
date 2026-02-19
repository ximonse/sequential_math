const ASSIGNMENTS_KEY = 'mathapp_assignments'
const ACTIVE_ASSIGNMENT_KEY = 'mathapp_active_assignment'
const ASSIGNMENT_PAYLOAD_VERSION = 1
const KNOWN_OPERATION_TYPES = new Set(['addition', 'subtraction', 'multiplication', 'division'])

function readAssignments() {
  const raw = localStorage.getItem(ASSIGNMENTS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(item => normalizeAssignment(item))
      .filter(Boolean)
  } catch {
    return []
  }
}

function writeAssignments(assignments) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments))
}

function makeAssignmentId() {
  return `asg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createAssignment(input) {
  const assignment = normalizeAssignment(
    {
      ...(input || {}),
      id: makeAssignmentId(),
      createdAt: Date.now()
    },
    { requireId: true }
  )
  if (!assignment) return null

  const assignments = readAssignments()
  assignments.unshift(assignment)
  writeAssignments(assignments)
  return assignment
}

export function getAssignments() {
  return readAssignments()
}

export function getAssignmentById(id) {
  if (!id) return null
  return readAssignments().find(a => String(a.id) === String(id)) || null
}

export function setActiveAssignment(assignmentId) {
  const normalized = String(assignmentId || '').trim()
  if (!normalized) {
    localStorage.removeItem(ACTIVE_ASSIGNMENT_KEY)
    return
  }
  localStorage.setItem(ACTIVE_ASSIGNMENT_KEY, normalized)
}

export function clearActiveAssignment() {
  localStorage.removeItem(ACTIVE_ASSIGNMENT_KEY)
}

export function getActiveAssignment() {
  const id = localStorage.getItem(ACTIVE_ASSIGNMENT_KEY)
  if (!id) return null
  return getAssignmentById(id)
}

export function deleteAssignment(assignmentId) {
  if (!assignmentId) return
  const next = readAssignments().filter(a => a.id !== assignmentId)
  writeAssignments(next)

  const activeId = localStorage.getItem(ACTIVE_ASSIGNMENT_KEY)
  if (activeId === assignmentId) {
    localStorage.removeItem(ACTIVE_ASSIGNMENT_KEY)
  }
}

export function clearAllAssignments() {
  writeAssignments([])
  localStorage.removeItem(ACTIVE_ASSIGNMENT_KEY)
}

export function buildAssignmentLink(assignmentId, assignmentPayload = null) {
  const normalizedId = String(assignmentId || '').trim()
  if (!normalizedId) return ''
  const base = window.location.origin
  const resolved = normalizeAssignment(
    assignmentPayload && typeof assignmentPayload === 'object'
      ? assignmentPayload
      : getAssignmentById(normalizedId),
    { requireId: true }
  )
  const params = new URLSearchParams()
  params.set('assignment', normalizedId)

  const encoded = encodeAssignmentPayload(resolved)
  if (encoded) {
    params.set('assignment_payload', encoded)
  }

  return `${base}/?${params.toString()}`
}

export function encodeAssignmentPayload(assignment) {
  const normalized = normalizeAssignment(assignment, { requireId: true })
  if (!normalized) return ''
  const payload = {
    v: ASSIGNMENT_PAYLOAD_VERSION,
    id: normalized.id,
    kind: normalized.kind,
    title: normalized.title,
    problemTypes: normalized.problemTypes,
    minLevel: normalized.minLevel,
    maxLevel: normalized.maxLevel,
    targetCount: normalized.targetCount,
    ncmCodes: normalized.ncmCodes,
    ncmAbilityTags: normalized.ncmAbilityTags,
    createdAt: normalized.createdAt
  }
  return toBase64Url(JSON.stringify(payload))
}

export function decodeAssignmentPayload(encoded) {
  if (!encoded) return null
  try {
    const json = fromBase64Url(String(encoded))
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    const normalized = normalizeAssignment(parsed, { requireId: true })
    if (!normalized) return null
    return normalized
  } catch {
    return null
  }
}

function normalizeAssignment(input, options = {}) {
  if (!input || typeof input !== 'object') return null

  const id = String(input.id || '').trim()
  if (options.requireId && !id) return null

  const kind = String(input.kind || 'standard').trim() === 'ncm' ? 'ncm' : 'standard'
  const title = String(input.title || '').trim() || (kind === 'ncm' ? 'NCM-uppdrag' : 'Uppdrag')
  const targetCount = normalizePositiveInt(input.targetCount, kind === 'ncm' ? 10 : 15)
  const createdAt = Number(input.createdAt || 0) > 0 ? Number(input.createdAt) : Date.now()

  if (kind === 'ncm') {
    const ncmCodes = normalizeCodeList(input.ncmCodes)
    const ncmAbilityTags = normalizeTagList(input.ncmAbilityTags)
    return {
      id,
      kind,
      title,
      problemTypes: [],
      minLevel: 1,
      maxLevel: 12,
      targetCount,
      createdAt,
      ncmCodes,
      ncmAbilityTags
    }
  }

  const problemTypes = normalizeProblemTypes(input.problemTypes)
  const minLevel = clampLevel(Number(input.minLevel || 1))
  const maxLevel = Math.max(minLevel, clampLevel(Number(input.maxLevel || 12)))

  return {
    id,
    kind: 'standard',
    title,
    problemTypes,
    minLevel,
    maxLevel,
    targetCount,
    createdAt,
    ncmCodes: [],
    ncmAbilityTags: []
  }
}

function normalizeProblemTypes(problemTypes) {
  const list = Array.isArray(problemTypes) ? problemTypes : []
  const unique = []
  for (const item of list) {
    const normalized = String(item || '').trim()
    if (!KNOWN_OPERATION_TYPES.has(normalized)) continue
    if (!unique.includes(normalized)) unique.push(normalized)
  }
  if (unique.length === 0) return ['addition']
  return unique
}

function normalizeCodeList(list) {
  const values = Array.isArray(list) ? list : []
  return Array.from(new Set(
    values
      .map(item => String(item || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim())
      .filter(Boolean)
  ))
}

function normalizeTagList(list) {
  const values = Array.isArray(list) ? list : []
  return Array.from(new Set(
    values
      .map(item => String(item || '').trim())
      .filter(Boolean)
  ))
}

function normalizePositiveInt(value, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.max(1, Math.round(numeric))
}

function clampLevel(level) {
  return Math.max(1, Math.min(12, Number(level) || 1))
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding === 2) base64 += '=='
  else if (padding === 3) base64 += '='
  else if (padding !== 0) throw new Error('Invalid base64url')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
