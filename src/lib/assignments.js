const ASSIGNMENTS_KEY = 'mathapp_assignments'
const ACTIVE_ASSIGNMENT_KEY = 'mathapp_active_assignment'

function readAssignments() {
  const raw = localStorage.getItem(ASSIGNMENTS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
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
  const assignment = {
    id: makeAssignmentId(),
    title: input.title || 'Uppdrag',
    problemTypes: Array.isArray(input.problemTypes) ? input.problemTypes : ['addition'],
    minLevel: Number.isFinite(input.minLevel) ? input.minLevel : 1,
    maxLevel: Number.isFinite(input.maxLevel) ? input.maxLevel : 12,
    targetCount: Number.isFinite(input.targetCount) ? input.targetCount : 15,
    createdAt: Date.now()
  }

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
  return readAssignments().find(a => a.id === id) || null
}

export function setActiveAssignment(assignmentId) {
  localStorage.setItem(ACTIVE_ASSIGNMENT_KEY, assignmentId)
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

export function buildAssignmentLink(assignmentId) {
  if (!assignmentId) return ''
  const base = window.location.origin
  return `${base}/?assignment=${encodeURIComponent(assignmentId)}`
}
