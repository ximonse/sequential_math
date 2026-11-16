import { kv } from '@vercel/kv'
import { createHash } from 'node:crypto'
import { catalogCard, invalidateStudentCatalog } from './_studentCatalogCard.js'

// Every student writer uses this compare-and-set boundary. Transforms rerun
// on conflicts and must validate authorization against the latest record.
// Decoding a large profile twice in Lua exceeded the database's script time
// limit (a 4 MB pupil profile, 2026-11-16). Records are therefore written with
// serverRevision first, so the script reads it from the start of the stored
// text; only an older record is decoded, once. Class ids arrive as ARGV[5]
// instead of decoding the whole new record.
export const STUDENT_CAS_SCRIPT = `
if redis.call('EXISTS', KEYS[2]) == 1 then return -2 end
local raw = redis.call('GET', KEYS[1])
local version = -1
if raw then
  version = tonumber(string.match(raw, '^{"serverRevision":(%-?%d+)[,}]'))
  if not version then
    local current = cjson.decode(raw)
    version = tonumber(current.serverRevision) or 0
  end
end
if version ~= tonumber(ARGV[1]) then return 0 end
if ARGV[2] == 'delete' then
  redis.call('SET', KEYS[2], ARGV[3])
  redis.call('DEL', KEYS[1])
  redis.call('SREM', KEYS[3], ARGV[4])
else
  for i = 4, #KEYS do
    if redis.call('EXISTS', KEYS[i]) == 1 then return -4 end
  end
  for _, classId in ipairs(cjson.decode(ARGV[5])) do
    if redis.call('EXISTS', 'class_deleted:' .. classId) == 1 then return -3 end
  end
  redis.call('SET', KEYS[1], ARGV[3])
  redis.call('SADD', KEYS[3], ARGV[4])
end
return 1
`

export function studentStoreError(status, message) {
  return Object.assign(new Error(message), { status })
}

export function studentDeletedKey(studentId) {
  const digest = createHash('sha256').update(String(studentId || '').trim().toUpperCase(), 'utf8').digest('hex')
  return `student_deleted:${digest}`
}

export async function isStudentDeleted(studentId, { store = kv } = {}) {
  const normalized = String(studentId || '').trim().toUpperCase()
  if (!normalized) return false
  const removed = await Promise.all([store.exists(studentDeletedKey(normalized)), store.exists(`student_deleted:${normalized}`)])
  return removed.some(Boolean)
}

// Many pupils at once: both tombstones are plain string keys, so one MGET per
// batch replaces two EXISTS round trips per pupil (docs/STYRNING_BELASTNING.md).
export async function deletedStudents(studentIds, { store = kv, batchSize = 50 } = {}) {
  const ids = studentIds.map(id => String(id || '').trim().toUpperCase())
  const keys = ids.flatMap(id => [studentDeletedKey(id), `student_deleted:${id}`])
  const parts = []
  for (let start = 0; start < keys.length; start += batchSize * 2) parts.push(keys.slice(start, start + batchSize * 2))
  // The batches are independent; read them side by side, not one after another.
  const values = (await Promise.all(parts.map(async part => {
    const result = await store.mget(...part)
    if (!Array.isArray(result) || result.length !== part.length) throw Error('Ofullständig raderingskontroll från lagringen.')
    return result
  }))).flat()
  return ids.map((id, i) => Boolean(id) && (values[2 * i] != null || values[2 * i + 1] != null))
}

function withoutRevision(record) {
  const rest = { ...record }
  delete rest.serverRevision
  delete rest.serverUpdatedAt
  return rest
}

export async function mutateStoredRecord(kind, id, transform, { store = kv } = {}) {
  if (!id || !['student', 'class', 'school', 'group'].includes(kind)) throw studentStoreError(400, 'Invalid record identity')
  const key = `${kind}:${id}`
  const deletedKey = kind === 'student' ? studentDeletedKey(id) : `${kind}_deleted:${id}`
  for (let attempt = 0; attempt < 8; attempt++) {
    if (kind === 'student' ? await isStudentDeleted(id, { store }) : await store.exists(deletedKey)) throw studentStoreError(410, 'Record deleted')
    const current = await store.get(key)
    const version = current ? Number(current.serverRevision) || 0 : -1
    const next = await transform(current)
    if (next === undefined) return current
    // serverRevision must be the first key in the stored JSON (see the script).
    const record = next === null ? null : {
      serverRevision: version + 1, serverUpdatedAt: Date.now(), ...withoutRevision(next)
    }
    const classIds = Array.isArray(record?.classIds) ? record.classIds.map(String) : []
    const result = Number(await store.eval(STUDENT_CAS_SCRIPT,
      [key, deletedKey, { student: 'students:index', class: 'classes:index', school: 'schools:index', group: 'groups:index' }[kind],
        ...(record?.pupilIds || []).flatMap(pupilId => [studentDeletedKey(pupilId), `student_deleted:${pupilId}`])],
      [version, record === null ? 'delete' : 'write',
        record === null ? String(Date.now()) : JSON.stringify(record), id, JSON.stringify(classIds)]))
    if (result === 1) return record
    if (result === -2) throw studentStoreError(410, 'Record deleted')
    if (result === -3) throw studentStoreError(409, 'Class deleted; refresh membership')
    if (result === -4) throw studentStoreError(409, 'En elev har tagits bort. Läs in gruppen igen.')
  }
  throw studentStoreError(409, 'Concurrent update; retry the request')
}

export async function mutateStudentRecord(studentId, transform, options) {
  const id = String(studentId || '').trim().toUpperCase()
  let metadataChanged = false
  const saved = await mutateStoredRecord('student', id, async current => {
    const next = await transform(current)
    metadataChanged = next !== undefined && JSON.stringify(catalogCard(current)) !== JSON.stringify(catalogCard(next))
    return next ? { ...next, studentId: id } : next
  }, options)
  if (metadataChanged) await invalidateStudentCatalog(id, options?.store)
  return saved
}

export async function createStudentRecord(studentId, profile, options) {
  return mutateStudentRecord(studentId, current => {
    if (current) throw studentStoreError(409, 'Student ID already exists')
    return profile
  }, options)
}
