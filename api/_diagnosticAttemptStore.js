import { kv } from '@vercel/kv'
import { replayDiagnosticGrid } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { DiagnosticAppendError, prepareDiagnosticAppend } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'
import { studentDeletedKey } from './_studentStore.js'

// This boundary only appends to an existing, server-created attempt. The API
// caller must check the live pupil session and frozen assignment before use.
export const DIAGNOSTIC_APPEND_CAS_SCRIPT = `
if redis.call('EXISTS', KEYS[3]) == 1 or redis.call('EXISTS', KEYS[4]) == 1 then return -2 end
if redis.call('EXISTS', KEYS[5]) == 1 then return -3 end
local assignmentRaw = redis.call('GET', KEYS[6])
if not assignmentRaw or cjson.decode(assignmentRaw).status ~= 'active' then return -9 end
local raw = redis.call('GET', KEYS[1])
if not raw then return -4 end
local current = cjson.decode(raw)
if current.studentId ~= ARGV[4] or current.assignmentId ~= ARGV[5] then return -5 end
local assignment = cjson.decode(assignmentRaw)
if assignment.classId ~= current.classIdAtAttempt
  or assignment.evidenceClass ~= 'diagnostic_only' then return -9 end
local target = false
for _, id in ipairs(assignment.studentIds) do
  if id == ARGV[4] then target = true end
end
if not target then return -9 end
local item = false
for _, candidate in ipairs(assignment.items) do
  if candidate.assignmentItemId == current.assignmentItemId
    and candidate.taskId == current.taskId
    and tonumber(candidate.taskVersion) == tonumber(current.taskVersion) then item = true end
end
if not item then return -9 end
local classRaw = redis.call('GET', KEYS[8])
if not classRaw or cjson.decode(classRaw).archived == true then return -9 end
local studentRaw = redis.call('GET', KEYS[7])
if not studentRaw then return -2 end
local student = cjson.decode(studentRaw)
local member = student.classId == assignment.classId
if student.classIds then
  for _, id in ipairs(student.classIds) do
    if id == assignment.classId then member = true end
  end
end
if not member then return -9 end
if tonumber(current.serverRevision) ~= tonumber(ARGV[1])
  or tonumber(current.lastSequence) ~= tonumber(ARGV[2]) then return 0 end
if current.status ~= 'in_progress' then return -6 end
if redis.call('LLEN', KEYS[2]) ~= tonumber(ARGV[2]) then return -7 end
local next = cjson.decode(ARGV[3])
if tonumber(next.serverRevision) ~= tonumber(ARGV[1]) + 1
  or tonumber(next.lastSequence) ~= tonumber(ARGV[2]) + tonumber(ARGV[6]) then return -8 end
for i = 7, #ARGV do redis.call('RPUSH', KEYS[2], ARGV[i]) end
redis.call('SET', KEYS[1], ARGV[3])
return 1
`

const conflict = message => new DiagnosticAppendError(409, 'revision_conflict', message)

function checkIdentity(attemptId, studentId) {
  if (!/^[A-Za-z0-9_-]{1,128}$/u.test(attemptId || '') || !studentId) {
    throw new DiagnosticAppendError(400, 'invalid_identity', 'Invalid diagnostic attempt identity')
  }
}

function gridFromRecord(record, events) {
  if (!record?.grid || !Array.isArray(events)
    || !record.studentId || !record.assignmentId || !record.classIdAtAttempt
    || record.evidenceClass !== 'diagnostic_only'
    || record.lastSequence !== events.length
    || record.grid.attemptId !== record.attemptId
    || record.grid.taskId !== record.taskId
    || record.grid.taskVersion !== record.taskVersion) {
    throw new DiagnosticAppendError(409, 'corrupt_snapshot', 'Saved diagnostic attempt is inconsistent')
  }
  try { return replayDiagnosticGrid({ ...record.grid, events }) } catch {
    throw new DiagnosticAppendError(409, 'corrupt_snapshot', 'Saved diagnostic grid cannot be replayed')
  }
}

export async function readDiagnosticAttempt(attemptId, { store = kv } = {}) {
  checkIdentity(attemptId, 'server')
  const record = await store.get(`diagnostic_attempt:${attemptId}`)
  if (!record) return null
  if (await store.exists(studentDeletedKey(record.studentId))
    || await store.exists(`student_deleted:${record.studentId}`)
    || await store.exists(`class_deleted:${record.classIdAtAttempt}`)) {
    throw new DiagnosticAppendError(410, 'attempt_unavailable', 'Diagnostic attempt is no longer available')
  }
  const events = await store.lrange(`diagnostic_attempt_events:${attemptId}`, 0, -1)
  return { record, snapshot: gridFromRecord(record, events || []) }
}

/** Append only after the caller has authorized this pupil and assignment. */
export async function appendDiagnosticAttempt({ attemptId, studentId, expectedRevision, events }, { store = kv } = {}) {
  checkIdentity(attemptId, studentId)
  const saved = await readDiagnosticAttempt(attemptId, { store })
  if (!saved) throw new DiagnosticAppendError(404, 'attempt_not_found', 'Diagnostic attempt not found')
  const { record, snapshot } = saved
  if (record.studentId !== studentId || record.evidenceClass !== 'diagnostic_only') {
    throw new DiagnosticAppendError(403, 'attempt_forbidden', 'Diagnostic attempt is not available to this pupil')
  }
  const prepared = prepareDiagnosticAppend({ snapshot, serverRevision: record.serverRevision,
    expectedRevision, events })
  // A retry is still subject to deletion. It does not mutate storage.
  const keys = [`diagnostic_attempt:${attemptId}`, `diagnostic_attempt_events:${attemptId}`,
    studentDeletedKey(studentId), `student_deleted:${studentId}`, `class_deleted:${record.classIdAtAttempt}`,
    `diagnostic_assignment:${record.assignmentId}`, `student:${studentId}`,
    `class:${record.classIdAtAttempt}`]
  if (prepared.kind === 'duplicate') {
    const assignment = await store.get(keys[5])
    if (await store.exists(keys[2]) || await store.exists(keys[3]) || await store.exists(keys[4])
      || assignment?.status !== 'active') {
      throw new DiagnosticAppendError(410, 'attempt_unavailable', 'Diagnostic attempt is no longer available')
    }
    return { ...prepared, attemptId }
  }
  const nextRecord = { ...record, serverRevision: prepared.serverRevision,
    lastSequence: prepared.snapshot.events.length, status: prepared.snapshot.status,
    grid: { ...prepared.snapshot, events: undefined } }
  delete nextRecord.grid.events
  const result = Number(await store.eval(DIAGNOSTIC_APPEND_CAS_SCRIPT, keys,
    [record.serverRevision, record.lastSequence, JSON.stringify(nextRecord), studentId,
      record.assignmentId, events.length, ...events.map(event => JSON.stringify(event))]))
  if (result === 1) return { kind: 'append', attemptId, serverRevision: prepared.serverRevision, ack: prepared.ack,
    snapshot: prepared.snapshot }
  if (result === -2 || result === -3 || result === -9) {
    throw new DiagnosticAppendError(410, 'attempt_unavailable', 'Diagnostic attempt is no longer available')
  }
  if (result === -4) throw new DiagnosticAppendError(404, 'attempt_not_found', 'Diagnostic attempt not found')
  if (result === -7 || result === -8) {
    throw new DiagnosticAppendError(409, 'corrupt_snapshot', 'Saved diagnostic attempt is inconsistent')
  }
  throw conflict('Diagnostic attempt changed on another device')
}
