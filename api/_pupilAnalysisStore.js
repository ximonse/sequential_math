import { randomBytes } from 'node:crypto'
import { kv } from '@vercel/kv'
import { studentDeletedKey } from './_studentStore.js'
import { evidenceError, evidenceHash } from './_pupilEvidence.js'

export const PUPIL_ANALYSIS_CAS_SCRIPT = `
if redis.call('EXISTS', KEYS[2]) == 1 or redis.call('EXISTS', KEYS[3]) == 1
  or redis.call('EXISTS', KEYS[4]) == 1 then return -1 end
local pupilRaw = redis.call('GET', KEYS[5])
local classRaw = redis.call('GET', KEYS[6])
if not pupilRaw or not classRaw then return -1 end
local pupil = cjson.decode(pupilRaw)
if cjson.decode(classRaw).archived == true then return -1 end
local member = pupil.classId == ARGV[3]
if pupil.classIds then for _, id in ipairs(pupil.classIds) do
  if id == ARGV[3] then member = true end
end end
if not member then return -1 end
local old = redis.call('GET', KEYS[1])
local revision = old and cjson.decode(old).revision or 0
if tonumber(revision) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1
`
export const pupilAnalysisKey = (studentId, classId, teacherId) => `pupil_analysis_reports:${studentId}:${classId}:${teacherId}`

export async function readPupilAnalysisState(studentId, classId, teacherId, { store = kv } = {}) {
  const value = await store.get(pupilAnalysisKey(studentId, classId, teacherId))
  if (value && (value.studentId !== studentId || value.classId !== classId || value.teacherId !== teacherId
    || value.schemaVersion !== 1 || !Number.isSafeInteger(value.revision) || !Array.isArray(value.reports)
    || !value.reports.every(item => typeof item?.id === 'string' && item.report && Array.isArray(item.checkIns)))) {
    throw evidenceError(409, 'analysis_inconsistent', 'Rapportlagringen behöver granskas innan den kan ändras.')
  }
  return value || { schemaVersion: 1, studentId, classId, teacherId, revision: 0, reports: [] }
}

export async function appendPupilAnalysis(state, command, content, { store = kv, now = Date.now() } = {}) {
  const { action, requestId, expectedRevision, reportId } = command
  if (!['create_report', 'check_in'].includes(action) || typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/u.test(requestId)
    || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw evidenceError(400, 'invalid_analysis_command', 'Rapportåtgärden saknar giltig identitet eller revision.')
  }
  const inputHash = evidenceHash({ action, reportId: reportId || null, content })
  const prior = state.reports.flatMap(item => [item, ...item.checkIns]).find(item => item.requestId === requestId)
  if (prior) {
    if (prior.inputHash !== inputHash) throw evidenceError(409, 'request_reused', 'Samma begäran har redan använts för annat innehåll.')
    return state
  }
  if (state.revision !== expectedRevision) throw evidenceError(409, 'analysis_conflict', 'Rapporten har ändrats i en annan flik. Din text är kvar; läs senaste sparade version och jämför.')
  const next = structuredClone(state)
  if (action === 'create_report') {
    if (next.reports.length >= 20) throw evidenceError(413, 'analysis_history_full', 'Rapporthistoriken är full. Inga äldre versioner har raderats.')
    next.reports.push({ id: `report_${randomBytes(12).toString('hex')}`, version: next.reports.length + 1,
      createdAt: now, requestId, inputHash, report: content, checkIns: [] })
  } else {
    const target = next.reports.find(item => item.id === reportId)
    if (!target) throw evidenceError(404, 'analysis_not_found', 'Rapportversionen finns inte.')
    if (target.checkIns.length >= 50) throw evidenceError(413, 'analysis_history_full', 'Avstämningshistoriken är full. Tidigare avstämningar är bevarade.')
    target.checkIns.push({ ...content, revision: target.checkIns.length + 1, createdAt: now, requestId, inputHash })
  }
  next.revision++
  if (Buffer.byteLength(JSON.stringify(next)) > 2 * 1024 * 1024) throw evidenceError(413, 'analysis_history_full', 'Rapportlagringen är full. Tidigare versioner är bevarade.')
  const saved = Number(await store.eval(PUPIL_ANALYSIS_CAS_SCRIPT,
    [pupilAnalysisKey(state.studentId, state.classId, state.teacherId), studentDeletedKey(state.studentId),
      `student_deleted:${state.studentId}`, `class_deleted:${state.classId}`, `student:${state.studentId}`, `class:${state.classId}`],
    [expectedRevision, JSON.stringify(next), state.classId]))
  if (saved === -1) throw evidenceError(410, 'analysis_unavailable', 'Eleven eller klassen är inte längre tillgänglig.')
  if (saved !== 1) throw evidenceError(409, 'analysis_conflict', 'En annan flik hann spara. Din text är kvar; läs senaste sparade version och jämför.')
  return next
}
