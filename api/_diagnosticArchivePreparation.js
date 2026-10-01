import { kv } from '@vercel/kv'
import { studentDeletedKey } from './_studentStore.js'
import { replayDiagnosticGrid } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { buildDiagnosticArchiveSeries } from '../src/domains/arithmetic/diagnosticArchiveSeries.js'

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
const invalid = () => { throw new Error('Diagnostic archive source is unavailable or inconsistent') }

// Called only after the pupil tombstone blocks all new appends. This reads raw
// storage internally; it does not make deleted attempts available through API.
export async function prepareFrozenDiagnosticSeries(studentId, { store = kv } = {}) {
  if (!validId(studentId) || !(await store.exists(studentDeletedKey(studentId))
    || await store.exists(`student_deleted:${studentId}`))) invalid()
  const attemptIds = await store.smembers(`diagnostic_attempts_by_student:${studentId}`) || []
  if (!Array.isArray(attemptIds) || !attemptIds.every(validId)
    || new Set(attemptIds).size !== attemptIds.length) invalid()
  const sources = await Promise.all(attemptIds.map(async attemptId => {
    const record = await store.get(`diagnostic_attempt:${attemptId}`)
    if (record?.studentId !== studentId || record?.attemptId !== attemptId
      || !validId(record.assignmentId) || !validId(record.assignmentItemId)
      || record.evidenceClass !== 'diagnostic_only') invalid()
    const assignment = await store.get(`diagnostic_assignment:${record.assignmentId}`)
    const item = assignment?.items?.find(candidate => candidate.assignmentItemId === record.assignmentItemId)
    if (assignment?.classId !== record.classIdAtAttempt
      || !assignment.studentIds?.includes(studentId)
      || item?.taskId !== record.taskId || item?.taskVersion !== record.taskVersion
      || !item.taskSnapshot) invalid()
    const events = await store.lrange(`diagnostic_attempt_events:${attemptId}`, 0, -1) || []
    if (!Array.isArray(events) || events.length !== record.lastSequence) invalid()
    const snapshot = replayDiagnosticGrid({ ...record.grid, events })
    return { record, task: item.taskSnapshot, snapshot }
  }))
  return buildDiagnosticArchiveSeries(sources)
}
