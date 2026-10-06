import { kv } from '@vercel/kv'
import { DiagnosticAppendError } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'
import { studentDeletedKey } from './_studentStore.js'

const forbidden = () => { throw new DiagnosticAppendError(403, 'not_assigned', 'Diagnostic task is not assigned to this pupil') }

export function diagnosticApiEnabled() {
  return process.env.NCM_DIAGNOSTIC_API_ENABLED === 'true'
}

export function diagnosticTestStudentIds() {
  return [...new Set(String(process.env.NCM_DIAGNOSTIC_TEST_STUDENT_IDS || '').split(',')
    .map(id => id.trim()).filter(id => /^[A-Za-z0-9_-]{1,128}$/u.test(id)))]
}

// An explicit server list restricts the pilot to those accounts. Left empty,
// an admin may pick any pupil in a class they already administer, which is the
// normal case now that the pilot is driven from the ordinary class roster.
export function diagnosticTestStudentAllowed(studentId) {
  const allowed = diagnosticTestStudentIds()
  return allowed.length === 0 || allowed.includes(studentId)
}

async function livePupilInClass(studentId, classId, store) {
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(studentId)) return null
  if (await store.exists(studentDeletedKey(studentId)) || await store.exists(`student_deleted:${studentId}`)) return null
  const pupil = await store.get(`student:${studentId}`)
  return pupil && [pupil.classId, ...(pupil.classIds || [])].includes(classId) ? studentId : null
}

export async function diagnosticAssignablePupilsInClass(classId, { store = kv, wholeClass = false } = {}) {
  const allowed = wholeClass ? [] : diagnosticTestStudentIds()
  const roster = allowed.length ? allowed : (await store.smembers(`class_students:${classId}`)) || []
  const checked = await Promise.all(roster.map(studentId => livePupilInClass(studentId, classId, store)))
  return checked.filter(Boolean)
}

// Recheck the frozen assignment and current class on every pupil read/write.
export async function assertDiagnosticPupilAccess(profile, record, { store = kv } = {}) {
  if (!profile || !record || record.studentId !== profile.studentId
    || record.evidenceClass !== 'diagnostic_only') forbidden()
  const assignment = await store.get(`diagnostic_assignment:${record.assignmentId}`)
  const item = assignment?.items?.find(candidate => candidate.assignmentItemId === record.assignmentItemId)
  const classIds = new Set([profile.classId, ...(profile.classIds || [])].filter(Boolean))
  if (assignment?.status !== 'active' || assignment.evidenceClass !== 'diagnostic_only'
    || assignment.classId !== record.classIdAtAttempt || !classIds.has(assignment.classId)
    || !assignment.studentIds?.includes(profile.studentId)
    || item?.taskId !== record.taskId || item?.taskVersion !== record.taskVersion
    || await store.exists(`class_deleted:${assignment.classId}`)) forbidden()
  const classRecord = await store.get(`class:${assignment.classId}`)
  if (!classRecord || classRecord.archived) forbidden()
  return assignment
}
