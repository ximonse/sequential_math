import { kv } from '@vercel/kv'
import { DiagnosticAppendError } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'

const forbidden = () => { throw new DiagnosticAppendError(403, 'not_assigned', 'Diagnostic task is not assigned to this pupil') }

export function diagnosticApiEnabled() {
  return process.env.NCM_DIAGNOSTIC_API_ENABLED === 'true'
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
