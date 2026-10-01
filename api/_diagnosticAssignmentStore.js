import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { kv } from '@vercel/kv'
import { createDiagnosticGrid } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { DiagnosticAppendError } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'
import { studentDeletedKey } from './_studentStore.js'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'

const require = createRequire(import.meta.url)
const manifest = require('../src/domains/arithmetic/diagnosticTasks.v1.json')

// Both functions require an authorized caller. These scripts enforce frozen
// membership and tombstones again at the atomic storage boundary.
export const CREATE_DIAGNOSTIC_ASSIGNMENT_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
if redis.call('EXISTS', KEYS[2]) == 1 then return -2 end
local classRaw = redis.call('GET', KEYS[3])
if not classRaw or cjson.decode(classRaw).archived == true then return -2 end
local n = tonumber(ARGV[1])
for i = 1, n do
  if redis.call('EXISTS', KEYS[3 + n + i]) == 1
    or redis.call('EXISTS', KEYS[3 + 2*n + i]) == 1 then return -3 end
  local raw = redis.call('GET', KEYS[3 + i])
  if not raw then return -4 end
  local pupil = cjson.decode(raw)
  local member = pupil.classId == ARGV[2]
  if pupil.classIds then
    for _, id in ipairs(pupil.classIds) do
      if id == ARGV[2] then member = true end
    end
  end
  if not member then return -5 end
end
redis.call('SET', KEYS[1], ARGV[3])
redis.call('SADD', KEYS[4 + 3*n], cjson.decode(ARGV[3]).assignmentId)
return 1
`

export const OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT = `
if redis.call('EXISTS', KEYS[3]) == 1 or redis.call('EXISTS', KEYS[4]) == 1 then return '-deleted' end
if redis.call('EXISTS', KEYS[5]) == 1 then return '-class' end
local classRaw = redis.call('GET', KEYS[6])
if not classRaw or cjson.decode(classRaw).archived == true then return '-class' end
local raw = redis.call('GET', KEYS[1])
if not raw then return '-missing' end
local assignment = cjson.decode(raw)
if assignment.status ~= 'active' or assignment.classId ~= ARGV[1]
  or tonumber(assignment.assignmentVersion) ~= tonumber(ARGV[2]) then return '-stopped' end
local target = false
for _, id in ipairs(assignment.studentIds) do
  if id == ARGV[3] then target = true end
end
if not target then return '-unauthorized' end
local item = false
for _, candidate in ipairs(assignment.items) do
  if candidate.assignmentItemId == ARGV[4] and candidate.taskId == ARGV[5]
    and tonumber(candidate.taskVersion) == tonumber(ARGV[6]) then item = true end
end
if not item then return '-item' end
local studentRaw = redis.call('GET', KEYS[2])
if not studentRaw then return '-deleted' end
local student = cjson.decode(studentRaw)
local member = student.classId == ARGV[1]
if student.classIds then
  for _, id in ipairs(student.classIds) do
    if id == ARGV[1] then member = true end
  end
end
if not member then return '-class' end
local active = redis.call('GET', KEYS[7])
if active then
  if redis.call('EXISTS', 'diagnostic_attempt:' .. active) == 0 then return '-broken' end
  return 'existing:' .. active
end
if redis.call('EXISTS', KEYS[8]) == 1 or redis.call('EXISTS', KEYS[9]) == 1 then return '-collision' end
redis.call('SET', KEYS[8], ARGV[7])
redis.call('SET', KEYS[7], ARGV[8])
redis.call('SADD', KEYS[10], ARGV[8])
redis.call('SADD', KEYS[11], ARGV[8])
return 'created:' .. ARGV[8]
`

const idPattern = /^[A-Za-z0-9_-]{1,128}$/u
const newId = () => randomBytes(16).toString('hex')
const fail = (status, code, message) => { throw new DiagnosticAppendError(status, code, message) }
const validId = value => typeof value === 'string' && idPattern.test(value)

export async function createDiagnosticAssignment({ classId, studentIds, taskIds, teacherId },
  { store = kv, makeId = newId } = {}) {
  if (!validId(classId) || !validId(teacherId)
    || !Array.isArray(studentIds) || studentIds.length < 1 || studentIds.length > 100
    || !studentIds.every(validId) || new Set(studentIds).size !== studentIds.length
    || !Array.isArray(taskIds) || taskIds.length < 1 || taskIds.length > manifest.tasks.length
    || new Set(taskIds).size !== taskIds.length) fail(400, 'invalid_assignment', 'Invalid diagnostic assignment')
  const tasks = taskIds.map(id => manifest.tasks.find(task => task.taskId === id))
  if (tasks.some(task => !task)) fail(400, 'invalid_task', 'Unknown diagnostic task')
  const assignmentId = makeId()
  const items = tasks.map(task => ({ assignmentItemId: makeId(), taskId: task.taskId,
    taskVersion: task.taskVersion, taskSnapshot: structuredClone(task) }))
  if (![assignmentId, ...items.map(item => item.assignmentItemId)].every(validId)
    || new Set(items.map(item => item.assignmentItemId)).size !== items.length) {
    fail(500, 'id_generation', 'Could not create diagnostic IDs')
  }
  const assignment = { assignmentId, assignmentVersion: 1, classId, studentIds: [...studentIds],
    items, teacherId, status: 'active', evidenceClass: 'diagnostic_only',
    manifestId: manifest.manifestId, manifestVersion: manifest.manifestVersion,
    language: manifest.language, sourceKind: manifest.sourceKind,
    instructionSv: manifest.instructionSv, createdAt: Date.now() }
  const keys = [`diagnostic_assignment:${assignmentId}`, `class_deleted:${classId}`, `class:${classId}`,
    ...studentIds.map(id => `student:${id}`), ...studentIds.map(studentDeletedKey),
    ...studentIds.map(id => `student_deleted:${id}`),
    `diagnostic_assignments_by_class:${classId}`]
  const result = Number(await store.eval(CREATE_DIAGNOSTIC_ASSIGNMENT_SCRIPT, keys,
    [studentIds.length, classId, JSON.stringify(assignment)]))
  if (result === -2) fail(410, 'class_unavailable', 'Diagnostic class is unavailable')
  if (result === -3 || result === -4 || result === -5) fail(409, 'student_unavailable', 'Diagnostic pupil is unavailable in this class')
  if (result !== 1) fail(409, 'assignment_conflict', 'Diagnostic assignment ID already exists')
  return assignment
}

export async function openDiagnosticAttempt({ assignmentId, assignmentItemId, studentId },
  { store = kv, makeId = newId } = {}) {
  if (![assignmentId, assignmentItemId, studentId].every(validId)) {
    fail(400, 'invalid_identity', 'Invalid diagnostic attempt identity')
  }
  const assignment = await store.get(`diagnostic_assignment:${assignmentId}`)
  if (!assignment || assignment.status !== 'active' || assignment.evidenceClass !== 'diagnostic_only') {
    fail(404, 'assignment_unavailable', 'Diagnostic assignment is unavailable')
  }
  const item = assignment.items?.find(candidate => candidate.assignmentItemId === assignmentItemId)
  if (!item || !assignment.studentIds?.includes(studentId)) fail(403, 'not_assigned', 'Pupil is not assigned this task')
  const attemptId = makeId()
  if (!validId(attemptId)) fail(500, 'id_generation', 'Could not create diagnostic attempt ID')
  const grid = createDiagnosticGrid({ attemptId, taskId: item.taskId, taskVersion: item.taskVersion })
  const record = { attemptId, studentId, assignmentId, assignmentItemId,
    classIdAtAttempt: assignment.classId, taskId: item.taskId, taskVersion: item.taskVersion,
    evidenceClass: 'diagnostic_only', serverRevision: 0, lastSequence: 0,
    status: 'in_progress', grid: { ...grid, events: undefined } }
  delete record.grid.events
  const keys = [`diagnostic_assignment:${assignmentId}`, `student:${studentId}`,
    studentDeletedKey(studentId), `student_deleted:${studentId}`,
    `class_deleted:${assignment.classId}`, `class:${assignment.classId}`,
    `diagnostic_active:${studentId}:${assignmentItemId}`, `diagnostic_attempt:${attemptId}`,
    `diagnostic_attempt_events:${attemptId}`, `diagnostic_attempts_by_student:${studentId}`,
    `diagnostic_attempts_by_assignment:${assignmentId}`]
  const result = String(await store.eval(OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT, keys,
    [assignment.classId, assignment.assignmentVersion, studentId, assignmentItemId,
      item.taskId, item.taskVersion, JSON.stringify(record), attemptId]))
  if (result.startsWith('created:') || result.startsWith('existing:')) {
    const savedId = result.slice(result.indexOf(':') + 1)
    const saved = await readDiagnosticAttempt(savedId, { store })
    if (!saved || saved.record.studentId !== studentId || saved.record.assignmentItemId !== assignmentItemId) {
      fail(409, 'corrupt_attempt', 'Active diagnostic attempt is inconsistent')
    }
    return { kind: result.startsWith('created:') ? 'created' : 'existing', ...saved }
  }
  if (result === '-deleted' || result === '-class' || result === '-stopped') {
    fail(410, 'attempt_unavailable', 'Diagnostic attempt is no longer available')
  }
  if (result === '-unauthorized' || result === '-item') fail(403, 'not_assigned', 'Pupil is not assigned this task')
  if (result === '-missing') fail(404, 'assignment_unavailable', 'Diagnostic assignment is unavailable')
  fail(409, 'attempt_conflict', 'Diagnostic attempt could not be opened')
}
