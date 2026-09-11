import { kv } from '@vercel/kv'

// Every student writer uses this compare-and-set boundary. Transforms rerun
// on conflicts and must validate authorization against the latest record.
export const STUDENT_CAS_SCRIPT = `
if redis.call('EXISTS', KEYS[2]) == 1 then return -2 end
local raw = redis.call('GET', KEYS[1])
local version = -1
if raw then
  local current = cjson.decode(raw)
  version = tonumber(current.serverRevision) or 0
end
if version ~= tonumber(ARGV[1]) then return 0 end
if ARGV[2] == 'delete' then
  redis.call('SET', KEYS[2], ARGV[3])
  redis.call('DEL', KEYS[1])
  redis.call('SREM', KEYS[3], ARGV[4])
else
  local nextRecord = cjson.decode(ARGV[3])
  if nextRecord.classIds then
    for _, classId in ipairs(nextRecord.classIds) do
      if redis.call('EXISTS', 'class_deleted:' .. classId) == 1 then return -3 end
    end
  end
  redis.call('SET', KEYS[1], ARGV[3])
  redis.call('SADD', KEYS[3], ARGV[4])
end
return 1
`

export function studentStoreError(status, message) {
  return Object.assign(new Error(message), { status })
}

export async function mutateStoredRecord(kind, id, transform, { store = kv } = {}) {
  if (!id || !['student', 'class', 'school', 'group'].includes(kind)) throw studentStoreError(400, 'Invalid record identity')
  const key = `${kind}:${id}`
  const deletedKey = `${kind}_deleted:${id}`
  for (let attempt = 0; attempt < 8; attempt++) {
    if (await store.exists(deletedKey)) throw studentStoreError(410, 'Record deleted')
    const current = await store.get(key)
    const version = current ? Number(current.serverRevision) || 0 : -1
    const next = await transform(current)
    if (next === undefined) return current
    const record = next === null ? null : {
      ...next, serverRevision: version + 1, serverUpdatedAt: Date.now()
    }
    const result = Number(await store.eval(STUDENT_CAS_SCRIPT,
      [key, deletedKey, { student: 'students:index', class: 'classes:index', school: 'schools:index', group: 'groups:index' }[kind]],
      [version, record === null ? 'delete' : 'write',
        record === null ? String(Date.now()) : JSON.stringify(record), id]))
    if (result === 1) return record
    if (result === -2) throw studentStoreError(410, 'Record deleted')
    if (result === -3) throw studentStoreError(409, 'Class deleted; refresh membership')
  }
  throw studentStoreError(409, 'Concurrent update; retry the request')
}

export function mutateStudentRecord(studentId, transform, options) {
  const id = String(studentId || '').trim().toUpperCase()
  return mutateStoredRecord('student', id, async current => {
    const next = await transform(current)
    return next ? { ...next, studentId: id } : next
  }, options)
}

export async function createStudentRecord(studentId, profile, options) {
  return mutateStudentRecord(studentId, current => {
    if (current) throw studentStoreError(409, 'Student ID already exists')
    return profile
  }, options)
}
