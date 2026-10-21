import { decodeAssignmentPayload } from './assignments.js'

export const MAX_ACTIVE_ASSIGNMENTS = 20

// A class or group record keeps a list of active assignments, newest first.
// Records written before the list existed hold one `activeAssignmentPayload`.
export function readActiveAssignments(record) {
  const list = Array.isArray(record?.activeAssignments)
    ? record.activeAssignments
    : record?.activeAssignmentPayload ? [{ payload: record.activeAssignmentPayload, activatedAt: 0 }] : []
  const seen = new Set()
  return list.flatMap(item => {
    const assignment = decodeAssignmentPayload(item?.payload)
    if (!assignment || seen.has(assignment.id)) return []
    seen.add(assignment.id)
    return [{ payload: String(item.payload), activatedAt: Number(item.activatedAt) || 0,
      ...(item.activatedBy ? { activatedBy: String(item.activatedBy) } : {}), assignment }]
  })
}

export function activeAssignmentIds(record) {
  return readActiveAssignments(record).map(item => item.assignment.id)
}

function stored(list) {
  return list.slice(0, MAX_ACTIVE_ASSIGNMENTS).map(({ payload, activatedAt, activatedBy }) => ({
    payload, activatedAt, ...(activatedBy ? { activatedBy } : {}) }))
}

// The returned fields replace the record's list; `activeAssignmentPayload`
// keeps the newest one for pupil devices that still run the older app.
export function activeAssignmentFields(list) {
  const next = stored(list)
  return { activeAssignments: next, activeAssignmentPayload: next[0]?.payload || null }
}

export function withActiveAssignment(record, payload, { activatedBy = '', now = Date.now() } = {}) {
  const assignment = decodeAssignmentPayload(payload)
  if (!assignment) return null
  const rest = readActiveAssignments(record).filter(item => item.assignment.id !== assignment.id)
  return activeAssignmentFields([{ payload, activatedAt: now, ...(activatedBy ? { activatedBy } : {}) }, ...rest])
}

export function withoutActiveAssignment(record, assignmentId) {
  return activeAssignmentFields(readActiveAssignments(record).filter(item => item.assignment.id !== String(assignmentId)))
}
