import { kv } from '@vercel/kv'
import { studentDeletedKey } from './_studentStore.js'

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
const invalid = () => { throw new Error('Diagnostic deletion index is unavailable or inconsistent') }

function uniqueIds(values) {
  if (!Array.isArray(values) || !values.every(validId)
    || new Set(values).size !== values.length) invalid()
  return values
}

// Read-only plan. The future executor must first persist the frozen series,
// then remove every reference and raw key with resumable, checked writes.
export async function planDiagnosticPupilDeletion(studentId, { store = kv } = {}) {
  if (!validId(studentId) || !(await store.exists(studentDeletedKey(studentId))
    || await store.exists(`student_deleted:${studentId}`))) invalid()
  const assignmentIds = uniqueIds(await store.smembers(`diagnostic_assignments_by_student:${studentId}`) || [])
  const attemptIds = uniqueIds(await store.smembers(`diagnostic_attempts_by_student:${studentId}`) || [])
  const assignments = await Promise.all(assignmentIds.map(async assignmentId => {
    const assignment = await store.get(`diagnostic_assignment:${assignmentId}`)
    if (assignment?.assignmentId !== assignmentId || !assignment.studentIds?.includes(studentId)
      || !Array.isArray(assignment.items) || !assignment.items.every(item => validId(item.assignmentItemId))) invalid()
    uniqueIds(assignment.studentIds)
    uniqueIds(assignment.items.map(item => item.assignmentItemId))
    return { assignmentId, remainingStudentIds: assignment.studentIds.filter(id => id !== studentId),
      activeKeys: assignment.items.map(item => `diagnostic_active:${studentId}:${item.assignmentItemId}`) }
  }))
  const attempts = await Promise.all(attemptIds.map(async attemptId => {
    const record = await store.get(`diagnostic_attempt:${attemptId}`)
    if (record?.attemptId !== attemptId || record.studentId !== studentId
      || !assignmentIds.includes(record.assignmentId)
      || record.evidenceClass !== 'diagnostic_only') invalid()
    return { attemptId, assignmentId: record.assignmentId,
      recordKey: `diagnostic_attempt:${attemptId}`,
      eventsKey: `diagnostic_attempt_events:${attemptId}` }
  }))
  return { assignments, attempts,
    studentAssignmentIndexKey: `diagnostic_assignments_by_student:${studentId}`,
    studentAttemptIndexKey: `diagnostic_attempts_by_student:${studentId}` }
}
