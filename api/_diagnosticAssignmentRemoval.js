import { kv } from '@vercel/kv'

// Archiving and deleting handed-out screenings (Simon 2026-11-07). Both act only on
// stopped screenings, so no pupil can be writing while the teacher tidies up.
// Archiving only hides the screening from the teacher's lists; every answer stays.
// Deleting removes the screening together with every pupil answer and review.
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, code }) }

async function stoppedAssignment(classId, assignmentId, store) {
  if (![classId, assignmentId].every(validId)) fail(400, 'invalid_identity', 'Ogiltig screening.')
  const assignment = await store.get(`diagnostic_assignment:${assignmentId}`)
  if (!assignment || assignment.classId !== classId) return null
  if (assignment.status !== 'stopped') fail(409, 'assignment_active', 'Avsluta screeningen först.')
  return assignment
}

export async function archiveDiagnosticAssignment({ classId, assignmentId, teacherId, archived }, { store = kv, now = Date.now() } = {}) {
  const assignment = await stoppedAssignment(classId, assignmentId, store)
  if (!assignment) fail(404, 'assignment_unavailable', 'Screeningen finns inte längre.')
  const next = { ...assignment }
  if (archived) Object.assign(next, { archivedAt: assignment.archivedAt || now, archivedBy: assignment.archivedBy || teacherId })
  else { delete next.archivedAt; delete next.archivedBy }
  await store.set(`diagnostic_assignment:${assignmentId}`, next)
  return next
}

// The assignment record is removed last, so an interrupted deletion can be repeated.
export async function deleteDiagnosticAssignment({ classId, assignmentId }, { store = kv } = {}) {
  const assignment = await stoppedAssignment(classId, assignmentId, store)
  if (!assignment) return { deleted: false, attempts: 0 }
  const attemptIds = (await store.smembers(`diagnostic_attempts_by_assignment:${assignmentId}`) || []).filter(validId)
  for (const attemptId of attemptIds) {
    const record = await store.get(`diagnostic_attempt:${attemptId}`)
    if (record && record.assignmentId !== assignmentId) fail(409, 'index_inconsistent', 'Screeningens index pekar på ett annat försök. Inget mer raderades.')
    if (record && validId(record.studentId)) {
      const activeKey = `diagnostic_active:${record.studentId}:${record.assignmentItemId}`
      if (await store.get(activeKey) === attemptId) await store.del(activeKey)
      await store.srem(`diagnostic_attempts_by_student:${record.studentId}`, attemptId)
    }
    await store.del(`diagnostic_attempt:${attemptId}`, `diagnostic_attempt_events:${attemptId}`, `diagnostic_review:${attemptId}`)
  }
  for (const studentId of (assignment.studentIds || []).filter(validId)) {
    await store.srem(`diagnostic_assignments_by_student:${studentId}`, assignmentId)
  }
  await store.srem(`diagnostic_assignments_by_class:${classId}`, assignmentId)
  await store.del(`diagnostic_attempts_by_assignment:${assignmentId}`)
  await store.del(`diagnostic_assignment:${assignmentId}`)
  return { deleted: true, attempts: attemptIds.length }
}
