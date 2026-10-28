import { createHash } from 'node:crypto'
import { DiagnosticAppendError } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'

const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')

// A retry reuses one assignment ID per teacher/class/request. A fingerprint
// binds that ID to the exact frozen payload; changing it is a conflict.
export function diagnosticDispatchOptions(body, teacherId) {
  if (body.requestId === undefined) return {}
  if (typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/u.test(body.requestId)) {
    throw new DiagnosticAppendError(400, 'invalid_request_id', 'Ogiltigt ID för utdelningsförsöket.')
  }
  return {
    assignmentId: digest(['screening-dispatch-v1', teacherId, body.classId, body.requestId]),
    dispatchFingerprint: digest(canonical({ teacherId, classId: body.classId,
      studentIds: [...body.studentIds].sort(), titleSv: body.titleSv || '',
      taskIds: body.taskIds || [], itemOptions: body.itemOptions || {}, customTasks: body.customTasks || [],
      sourceClassId: body.sourceClassId || '', sourceAssignmentId: body.sourceAssignmentId || '' }))
  }
}
