import { kv } from '@vercel/kv'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { listDiagnosticAssignmentAttempts } from './_diagnosticClassOverview.js'
import { prepareDiagnosticAppend } from '../src/domains/arithmetic/diagnosticAttemptAppend.js'
import { recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'

// Only runs after the assignment is stopped, so pupils can no longer append.
// The revision and event count must still match, as for a pupil submission.
export const FREEZE_DIAGNOSTIC_ATTEMPT_SCRIPT = `
local assignmentRaw = redis.call('GET', KEYS[3])
if not assignmentRaw or cjson.decode(assignmentRaw).status == 'active' then return -1 end
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local current = cjson.decode(raw)
if current.status ~= 'in_progress' then return 0 end
if tonumber(current.serverRevision) ~= tonumber(ARGV[1])
  or redis.call('LLEN', KEYS[2]) ~= tonumber(ARGV[2]) then return -2 end
redis.call('RPUSH', KEYS[2], ARGV[4])
redis.call('SET', KEYS[1], ARGV[3])
return 1
`

async function freezeAttempt(attemptId, assignmentId, store) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const saved = await readDiagnosticAttempt(attemptId, { store })
    if (!saved || saved.record.status !== 'in_progress') return false
    const { record, snapshot } = saved
    const frozen = recordDiagnosticGridEvent(snapshot, { type: 'submit' })
    const event = frozen.events.at(-1)
    const prepared = prepareDiagnosticAppend({ snapshot, serverRevision: record.serverRevision,
      expectedRevision: record.serverRevision, events: [event] })
    const next = { ...record, serverRevision: prepared.serverRevision, lastSequence: frozen.events.length,
      status: 'submitted', grid: { ...frozen } }
    delete next.grid.events
    // Lua cjson must not re-encode originals: empty arrays can become objects.
    const result = Number(await store.eval(FREEZE_DIAGNOSTIC_ATTEMPT_SCRIPT,
      [`diagnostic_attempt:${attemptId}`, `diagnostic_attempt_events:${attemptId}`, `diagnostic_assignment:${assignmentId}`],
      [record.serverRevision, record.lastSequence, JSON.stringify(next), JSON.stringify(event)]))
    if (result === 1) return true
    if (result !== -2) return false
  }
  throw new Error('Diagnostic attempt kept changing while it was frozen')
}

// Hands in every started answer of a stopped screening; unopened questions stay unanswered.
export async function freezeStoppedDiagnosticAttempts(assignment, { store = kv } = {}) {
  if (!assignment || assignment.status === 'active') return { frozen: 0, failed: 0 }
  const records = await listDiagnosticAssignmentAttempts(assignment, assignment.studentIds, { store })
  let frozen = 0
  let failed = 0
  for (const record of records.filter(item => item.status === 'in_progress')) {
    try {
      if (await freezeAttempt(record.attemptId, assignment.assignmentId, store)) frozen++
    } catch { failed++ }
  }
  return { frozen, failed }
}
