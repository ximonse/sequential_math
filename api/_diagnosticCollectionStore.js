import { kv } from '@vercel/kv'
import { studentDeletedKey } from './_studentStore.js'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { DiagnosticAppendError, prepareDiagnosticAppend } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'
import { recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'

// All revisions are checked before any submission is written. A failed request
// cannot leave a half-submitted collection. Existing frozen originals stay frozen.
export const SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 or redis.call('EXISTS', KEYS[2]) == 1
  or redis.call('EXISTS', KEYS[3]) == 1 then return -1 end
local classRaw = redis.call('GET', KEYS[4])
local assignmentRaw = redis.call('GET', KEYS[5])
local pupilRaw = redis.call('GET', KEYS[6])
if not classRaw or not assignmentRaw or not pupilRaw then return -1 end
local assignment = cjson.decode(assignmentRaw)
local pupil = cjson.decode(pupilRaw)
local proposals = cjson.decode(ARGV[2])
if cjson.decode(classRaw).archived == true or assignment.status ~= 'active'
  or assignment.evidenceClass ~= 'diagnostic_only' or #assignment.items ~= #proposals then return -1 end
local member = pupil.classId == assignment.classId
if pupil.classIds then for _, id in ipairs(pupil.classIds) do
  if id == assignment.classId then member = true end
end end
local assigned = false
for _, id in ipairs(assignment.studentIds) do if id == ARGV[1] then assigned = true end end
if not member or not assigned then return -1 end
for i, proposal in ipairs(proposals) do
  local raw = redis.call('GET', KEYS[5 + 2*i])
  if not raw then return -2 end
  local current = cjson.decode(raw)
  local item = assignment.items[i]
  if current.studentId ~= ARGV[1] or current.assignmentId ~= assignment.assignmentId
    or current.assignmentItemId ~= item.assignmentItemId or current.taskId ~= item.taskId
    or current.taskVersion ~= item.taskVersion or current.classIdAtAttempt ~= assignment.classId
    or current.evidenceClass ~= 'diagnostic_only' then return -1 end
  if current.serverRevision ~= proposal.revision or current.lastSequence ~= proposal.sequence
    or redis.call('LLEN', KEYS[6 + 2*i]) ~= proposal.sequence then return -2 end
  if proposal.next and current.status ~= 'in_progress' then return -2 end
end
for i, proposal in ipairs(proposals) do
  if proposal.next then
    redis.call('RPUSH', KEYS[6 + 2*i], proposal.eventJson)
    redis.call('SET', KEYS[5 + 2*i], proposal.nextJson)
  end
end
return 1
`

export async function submitDiagnosticCollection({ assignmentId, studentId, attempts }, { store = kv } = {}) {
  const assignment = await store.get(`diagnostic_assignment:${assignmentId}`)
  const fail = (status, code, message) => { throw new DiagnosticAppendError(status, code, message) }
  if (!assignment || assignment.status !== 'active' || assignment.evidenceClass !== 'diagnostic_only'
    || !assignment.studentIds?.includes(studentId)) fail(403, 'not_assigned', 'Samlingen är inte tilldelad detta konto.')
  if (!Array.isArray(attempts) || attempts.length !== assignment.items.length
    || attempts.some(item => !/^[A-Za-z0-9_-]{1,128}$/u.test(item?.attemptId || '')
      || !Number.isSafeInteger(item.revision) || item.revision < 0
      || !Number.isSafeInteger(item.sequence) || item.sequence < 0)
    || new Set(attempts.map(item => item.attemptId)).size !== attempts.length) {
    fail(400, 'invalid_collection', 'Alla frågor måste ingå i inlämningen.')
  }
  const saved = await Promise.all(attempts.map(item => readDiagnosticAttempt(item.attemptId, { store })))
  const ordered = assignment.items.map(item => {
    const result = saved.find(entry => entry?.record.assignmentItemId === item.assignmentItemId)
    if (!result || result.record.studentId !== studentId || result.record.assignmentId !== assignmentId) {
      fail(403, 'not_assigned', 'Underlaget tillhör inte denna samling och elev.')
    }
    const expected = attempts.find(entry => entry.attemptId === result.record.attemptId)
    if (result.record.status !== 'submitted' && (result.record.serverRevision !== expected.revision
      || result.record.lastSequence !== expected.sequence)) {
      fail(409, 'revision_conflict', 'En fråga har ändrats på en annan enhet. Inget nytt svar lämnades in.')
    }
    const proposal = { revision: result.record.serverRevision, sequence: result.record.lastSequence }
    if (result.record.status !== 'submitted') {
      const snapshot = recordDiagnosticGridEvent(result.snapshot, { type: 'submit' })
      const event = snapshot.events.at(-1)
      const prepared = prepareDiagnosticAppend({ snapshot: result.snapshot,
        serverRevision: proposal.revision, expectedRevision: proposal.revision, events: [event] })
      proposal.next = { ...result.record, serverRevision: prepared.serverRevision,
        lastSequence: snapshot.events.length, status: 'submitted', grid: { ...snapshot } }
      delete proposal.next.grid.events
      proposal.event = event
      // Lua cjson must not re-encode originals: empty arrays can become objects.
      proposal.nextJson = JSON.stringify(proposal.next)
      proposal.eventJson = JSON.stringify(event)
    }
    return { ...result, proposal }
  })
  const keys = [studentDeletedKey(studentId), `student_deleted:${studentId}`,
    `class_deleted:${assignment.classId}`, `class:${assignment.classId}`,
    `diagnostic_assignment:${assignmentId}`, `student:${studentId}`,
    ...ordered.flatMap(item => [`diagnostic_attempt:${item.record.attemptId}`, `diagnostic_attempt_events:${item.record.attemptId}`])]
  const result = Number(await store.eval(SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT, keys,
    [studentId, JSON.stringify(ordered.map(item => item.proposal))]))
  if (result === -1) fail(410, 'attempt_unavailable', 'Samlingen är inte längre tillgänglig.')
  if (result !== 1) fail(409, 'revision_conflict', 'Samlingen ändrades på en annan enhet. Inget nytt svar lämnades in.')
  return { submitted: true, attempts: ordered.map(item => ({ attemptId: item.record.attemptId,
    serverRevision: item.proposal.next?.serverRevision ?? item.record.serverRevision,
    snapshot: item.proposal.next ? { ...item.proposal.next.grid, events: [...item.snapshot.events, item.proposal.event] } : item.snapshot })) }
}
