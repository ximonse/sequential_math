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
    if (assignment?.assignmentId !== assignmentId || !validId(assignment.classId)
      || !assignment.studentIds?.includes(studentId)
      || !Array.isArray(assignment.items) || !assignment.items.every(item => validId(item.assignmentItemId))) invalid()
    uniqueIds(assignment.studentIds)
    uniqueIds(assignment.items.map(item => item.assignmentItemId))
    const classIndexKey = `diagnostic_assignments_by_class:${assignment.classId}`
    const attemptIndexKey = `diagnostic_attempts_by_assignment:${assignmentId}`
    const classAssignmentIds = uniqueIds(await store.smembers(classIndexKey) || [])
    const assignmentAttemptIds = uniqueIds(await store.smembers(attemptIndexKey) || [])
    if (!classAssignmentIds.includes(assignmentId)) invalid()
    for (const attemptId of assignmentAttemptIds) {
      const record = await store.get(`diagnostic_attempt:${attemptId}`)
      if (record?.attemptId !== attemptId || record.assignmentId !== assignmentId
        || !validId(record.studentId) || record.evidenceClass !== 'diagnostic_only'
        || (record.studentId === studentId && !attemptIds.includes(attemptId))) invalid()
    }
    return { assignmentId, remainingStudentIds: assignment.studentIds.filter(id => id !== studentId),
      classIndexKey, attemptIndexKey, assignmentAttemptIds,
      activeKeys: assignment.items.map(item => `diagnostic_active:${studentId}:${item.assignmentItemId}`) }
  }))
  const activeRefs = assignments.flatMap(assignment => assignment.activeKeys.map(key => ({
    assignmentId: assignment.assignmentId, assignmentItemId: key.split(':').at(-1), key
  })))
  const pointerIds = await Promise.all(activeRefs.map(ref => store.get(ref.key)))
  if (pointerIds.some(id => id !== null && (!validId(id) || !attemptIds.includes(id)))
    || new Set(pointerIds.filter(Boolean)).size !== pointerIds.filter(Boolean).length) invalid()
  const attempts = await Promise.all(attemptIds.map(async attemptId => {
    const record = await store.get(`diagnostic_attempt:${attemptId}`)
    if (record?.attemptId !== attemptId || record.studentId !== studentId
      || !assignmentIds.includes(record.assignmentId)
      || record.evidenceClass !== 'diagnostic_only') invalid()
    const assignment = assignments.find(item => item.assignmentId === record.assignmentId)
    const assignmentRecord = await store.get(`diagnostic_assignment:${record.assignmentId}`)
    if (!assignment?.assignmentAttemptIds.includes(attemptId)
      || !assignmentRecord?.items?.some(item => item.assignmentItemId === record.assignmentItemId)) invalid()
    return { attemptId, assignmentId: record.assignmentId,
      assignmentItemId: record.assignmentItemId,
      recordKey: `diagnostic_attempt:${attemptId}`,
      eventsKey: `diagnostic_attempt_events:${attemptId}` }
  }))
  for (let index = 0; index < pointerIds.length; index++) {
    if (!pointerIds[index]) continue
    const pointed = attempts.find(attempt => attempt.attemptId === pointerIds[index])
    if (pointed?.assignmentId !== activeRefs[index].assignmentId
      || pointed?.assignmentItemId !== activeRefs[index].assignmentItemId) invalid()
  }
  return { assignments: assignments.map(({ assignmentAttemptIds, ...assignment }) => assignment), attempts,
    studentAssignmentIndexKey: `diagnostic_assignments_by_student:${studentId}`,
    studentAttemptIndexKey: `diagnostic_attempts_by_student:${studentId}` }
}
