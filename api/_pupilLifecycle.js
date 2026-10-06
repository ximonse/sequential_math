import { randomBytes } from 'node:crypto'
import { kv } from '@vercel/kv'
import { studentDeletedKey, studentStoreError } from './_studentStore.js'
import { buildPupilTrainingStatistics } from '../src/lib/analysisHistorySanitizer.js'
import { replayDiagnosticGrid } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { buildDiagnosticArchiveSeries } from '../src/domains/arithmetic/diagnosticArchiveSeries.js'
import { removePupilReferences } from './_pupilReferenceWrite.js'

// The tombstone and recovery job become visible together. Every ordinary
// pupil writer already checks this tombstone, so the frozen profile cannot
// receive new training/diagnostic events while cleanup is retried.
export const BEGIN_PUPIL_LIFECYCLE_SCRIPT = `
if redis.call('EXISTS', KEYS[3]) == 1 then return 2 end
if redis.call('EXISTS', KEYS[2]) == 1 then return -2 end
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local profile = cjson.decode(raw)
if (tonumber(profile.serverRevision) or 0) ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[3], ARGV[2])
redis.call('SET', KEYS[2], ARGV[3])
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[4], ARGV[4])
redis.call('SADD', KEYS[5], ARGV[4])
return 1
`

// Shared objects are checked before ANY mutation. A concurrent teacher edit
// causes a retry instead of overwriting another pupil's work. The archive is
// published only in the same transaction that completes the entire cleanup.
export const FINISH_PUPIL_LIFECYCLE_SCRIPT = `
local function decode(raw)
  if not raw then return cjson.null end
  local ok, value = pcall(cjson.decode, raw)
  if ok then return value else return raw end
end
local function same(a, b)
  if type(a) ~= type(b) then return false end
  if type(a) ~= 'table' then return a == b end
  for k, v in pairs(a) do if not same(v, b[k]) then return false end end
  for k, v in pairs(b) do if not same(v, a[k]) then return false end end
  return true
end
if not redis.call('GET', KEYS[1]) then return 2 end
local plan = cjson.decode(ARGV[1])
for _, patch in ipairs(plan.patches) do
  if not same(decode(redis.call('GET', patch.key)), patch.before) then return 0 end
end
for _, patch in ipairs(plan.patches) do
  if patch.after == cjson.null then redis.call('DEL', patch.key)
  else redis.call('SET', patch.key, patch.afterJson) end
end
for _, key in ipairs(plan.deletes) do redis.call('DEL', key) end
for _, entry in ipairs(plan.removals) do redis.call('SREM', entry.key, entry.member) end
if ARGV[2] ~= '' then
  redis.call('SET', KEYS[3], ARGV[2])
  redis.call('SADD', KEYS[4], ARGV[4])
end
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[3])
return 1
`

export async function scanPupilKeys(store, match) {
  let cursor = 0
  const keys = new Set()
  do {
    const result = await store.scan(cursor, { match, count: 200 })
    cursor = Number(result[0])
    for (const key of result[1]) keys.add(key)
  } while (cursor !== 0)
  return [...keys]
}

const jobKey = id => `pupil_lifecycle:${id}`
const isPupil = (value, id) => String(value || '').toUpperCase() === id

// Never copy arbitrary profile fields or free text to the analysis archive.
// Existing export validation keeps mathematical answers and relative timing.
function trainingStatistics(profile) {
  const training = buildPupilTrainingStatistics(profile)
  const totals = {}
  for (const field of ['totalProblems', 'correctAnswers', 'lifetimeProblems', 'lifetimeCorrectAnswers',
    'lifetimeTimeSpent', 'lifetimeSpeedSamples', 'lifetimeSpeedTimeSpent']) {
    const value = profile.stats?.[field]
    if (typeof value === 'number' && Number.isFinite(value)) totals[field] = value
  }
  return { ...training, totals }
}

export async function buildPupilCleanup(id, job, store) {
  const deletes = new Set([`student_highscore_keys:${id}`, `diagnostic_assignments_by_student:${id}`,
    `diagnostic_attempts_by_student:${id}`])
  const patches = []
  const removals = [{ key: 'students:index', member: id }]
  const sources = []
  // An interrupted older write may leave indexed events without a record.
  for (const attemptId of await store.smembers(`diagnostic_attempts_by_student:${id}`)) {
    const record = await store.get(`diagnostic_attempt:${attemptId}`)
    if (record && !isPupil(record.studentId, id)) throw studentStoreError(409, 'Diagnostikindexet innehåller en annan elev. Städningen stoppades.')
    if (!record && job.mode === 'anonymize') throw studentStoreError(409, 'Diagnostikunderlaget är ofullständigt. Städningen kan återupptas.')
    deletes.add(`diagnostic_attempt:${attemptId}`)
    deletes.add(`diagnostic_attempt_events:${attemptId}`)
  }
  // Scan also finds older diagnostic assignments that predate pupil indexes.
  for (const key of await scanPupilKeys(store, 'diagnostic_attempt:*')) {
    const record = await store.get(key)
    if (!isPupil(record?.studentId, id)) continue
    deletes.add(key)
    deletes.add(`diagnostic_attempt_events:${record.attemptId}`)
    deletes.add(`diagnostic_active:${id}:${record.assignmentItemId}`)
    removals.push({ key: `diagnostic_attempts_by_assignment:${record.assignmentId}`, member: record.attemptId })
    if (job.mode === 'anonymize') {
      const assignment = await store.get(`diagnostic_assignment:${record.assignmentId}`)
      const task = assignment?.items?.find(item => item.assignmentItemId === record.assignmentItemId)?.taskSnapshot
      const events = await store.lrange(`diagnostic_attempt_events:${record.attemptId}`, 0, -1)
      if (!task || events.length !== record.lastSequence) throw studentStoreError(409, 'Diagnostikunderlaget är ofullständigt. Städningen kan återupptas.')
      sources.push({ record, task, snapshot: replayDiagnosticGrid({ ...record.grid, events }) })
    }
  }
  for (const key of await scanPupilKeys(store, 'diagnostic_assignment:*')) {
    const before = await store.get(key)
    if (!before?.studentIds?.some(value => isPupil(value, id))) continue
    const remaining = before.studentIds.filter(value => !isPupil(value, id))
    for (const item of before.items || []) deletes.add(`diagnostic_active:${id}:${item.assignmentItemId}`)
    if (remaining.length) patches.push({ key, before, after: { ...before, studentIds: remaining } })
    else {
      patches.push({ key, before, after: null })
      deletes.add(`diagnostic_attempts_by_assignment:${before.assignmentId}`)
      removals.push({ key: `diagnostic_assignments_by_class:${before.classId}`, member: before.assignmentId })
    }
  }
  for (const key of await scanPupilKeys(store, `diagnostic_active:${id}:*`)) deletes.add(key)
  for (const key of await scanPupilKeys(store, 'class_students:*')) removals.push({ key, member: id })
  for (const key of await scanPupilKeys(store, 'group:*')) {
    const before = await store.get(key)
    if (before?.pupilIds?.some(value => isPupil(value, id))) patches.push({ key, before, after: {
      ...before, pupilIds: before.pupilIds.filter(value => !isPupil(value, id)), serverRevision: (before.serverRevision || 0) + 1
    } })
  }
  for (const key of await scanPupilKeys(store, 'teacher_pupil_labels:*')) {
    const before = await store.get(key)
    const after = Object.fromEntries(Object.entries(before || {}).filter(([pupil]) => !isPupil(pupil, id)))
    if (Object.keys(after).length !== Object.keys(before || {}).length) patches.push({ key, before, after })
  }
  for (const key of await scanPupilKeys(store, 'teacher_workspace:*')) {
    const before = await store.get(key)
    const after = removePupilReferences(before, new Set([id]))
    if (JSON.stringify(after) !== JSON.stringify(before)) patches.push({ key, before, after })
  }
  for (const key of await scanPupilKeys(store, 'highscores:*')) {
    const before = await store.get(key)
    if (!Array.isArray(before)) continue
    const after = before.filter(entry => !isPupil(entry?.studentId, id))
    if (after.length !== before.length) patches.push({ key, before, after })
  }
  for (const pattern of ['student_session:*', 'student_login_code:*']) {
    for (const key of await scanPupilKeys(store, pattern)) {
      const before = await store.get(key)
      if (isPupil(before?.studentId || before, id)) patches.push({ key, before, after: null })
    }
  }
  const archive = job.mode === 'anonymize' ? { archiveId: job.archiveId, format: 'pupil-analysis-v1',
    frozen: true, training: trainingStatistics(job.profile), diagnostics: buildDiagnosticArchiveSeries(sources) } : null
  return { plan: { deletes: [...deletes], patches: patches.map(patch => ({ ...patch, afterJson: JSON.stringify(patch.after) })), removals }, archive }
}

export async function retirePupil(id, mode, authorize, { store = kv } = {}) {
  if (!['delete', 'anonymize'].includes(mode)) throw studentStoreError(400, 'Ogiltig elevåtgärd.')
  for (let retry = 0; retry < 8; retry++) {
    let job = await store.get(jobKey(id))
    if (job && job.mode !== mode) throw studentStoreError(409, 'Återuppta den redan påbörjade elevåtgärden först.')
    if (!job) {
      const profile = await store.get(`student:${id}`)
      if (!profile) {
        if (await store.exists(studentDeletedKey(id))) return { ok: true, deleted: true }
        throw studentStoreError(404, 'Eleven finns inte.')
      }
      await authorize(profile)
      job = { mode, archiveId: mode === 'anonymize' ? randomBytes(16).toString('hex') : '', profile }
      const started = Number(await store.eval(BEGIN_PUPIL_LIFECYCLE_SCRIPT,
        [`student:${id}`, studentDeletedKey(id), jobKey(id), 'students:index', 'pupil_lifecycle_pending'],
        [profile.serverRevision || 0, JSON.stringify(job), String(Date.now()), id]))
      if (started === 0 || started === 2) continue
      if (started !== 1) throw studentStoreError(409, 'Elevens data ändrades. Läs in listan igen.')
      job = await store.get(jobKey(id))
    }
    await authorize(job.profile)
    const { plan, archive } = await buildPupilCleanup(id, job, store)
    const finished = Number(await store.eval(FINISH_PUPIL_LIFECYCLE_SCRIPT,
      [jobKey(id), 'pupil_lifecycle_pending', `pupil_analysis:${job.archiveId}`, 'pupil_analysis:index'],
      [JSON.stringify(plan), archive ? JSON.stringify(archive) : '', id, job.archiveId]))
    if (finished === 0) continue
    return { ok: true, deleted: mode === 'delete', anonymized: mode === 'anonymize', archiveId: job.archiveId || undefined }
  }
  throw studentStoreError(409, 'Elevåtgärden är pausad efter samtidiga ändringar. Återuppta städningen.')
}
