import { decodeAssignmentPayload, encodeAssignmentPayload } from './assignments.js'

const progressKey = assignmentId => `assignment:${assignmentId}`

export function readAssignmentCompletedAt(profile, assignmentId) {
  return Number(profile?.assignmentProgress?.[progressKey(assignmentId)]?.completedAt) || 0
}

// NCM keeps its own skill progress under the same key; only its completion time is added.
export function markAssignmentCompleted(profile, assignment, now = Date.now()) {
  if (!profile || !assignment?.id) return
  if (!profile.assignmentProgress || typeof profile.assignmentProgress !== 'object') profile.assignmentProgress = {}
  const key = progressKey(assignment.id)
  const previous = profile.assignmentProgress[key]
  profile.assignmentProgress[key] = previous?.kind === 'ncm'
    ? { ...previous, completedAt: now, updatedAt: now }
    : { kind: assignment.kind || 'standard', assignmentId: String(assignment.id),
      assignmentTitle: String(assignment.title || ''), completedAt: now, updatedAt: now }
}

// Done only counts for the current activation: a reactivated assignment is to do again.
export function splitAssignments(profile, items) {
  const entries = (Array.isArray(items) ? items : []).flatMap(item => {
    const assignment = item?.assignment || decodeAssignmentPayload(item?.payload)
    return assignment ? [{ assignment, activatedAt: Number(item.activatedAt) || 0 }] : []
  })
  const isDone = entry => {
    const completedAt = readAssignmentCompletedAt(profile, entry.assignment.id)
    return completedAt > 0 && completedAt >= entry.activatedAt
  }
  return {
    todo: entries.filter(entry => !isDone(entry)).sort((a, b) => a.activatedAt - b.activatedAt).map(entry => entry.assignment),
    done: entries.filter(isDone).sort((a, b) => b.activatedAt - a.activatedAt).map(entry => entry.assignment)
  }
}

export function nextUndoneAssignment(profile, items, excludeId = '') {
  return splitAssignments(profile, items).todo.find(assignment => assignment.id !== excludeId) || null
}

const FLUENCY_TYPES = ['number_bonds', 'doubles']
export const DEFAULT_ASSIGNMENT_TARGET = 30

export function getAssignmentTarget(assignment) {
  const target = Math.floor(Number(assignment?.targetCount))
  return target > 0 ? target : DEFAULT_ASSIGNMENT_TARGET
}

// Talpar/Dubblor, NCM, tables, talbild and focus end on their own; other practice ends at its task count.
export function endsAtTaskCount(assignment) {
  if (!assignment?.id || !['standard', 'math_practice'].includes(assignment.kind || 'standard')) return false
  const types = assignment.problemTypes || []
  return !(types.length > 0 && types.every(type => FLUENCY_TYPES.includes(type)))
}

// Where each kind of assignment starts. Focus opens on the pupil's home page.
export function assignmentLaunchPath(studentId, assignment) {
  const params = new URLSearchParams({ assignment: String(assignment.id), assignment_payload: encodeAssignmentPayload(assignment) })
  if (assignment.kind === 'focus') return `/student/${studentId}?${params}`
  if (assignment.kind === 'subitizing') return `/student/${studentId}/subitizing?${params}`
  if (assignment.kind === 'table') {
    params.set('mode', 'multiplication')
    params.set('tables', assignment.tables.join(','))
  }
  return `/student/${studentId}/practice?${params}`
}
