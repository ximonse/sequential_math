import { kv } from '@vercel/kv'
import { studentDeletedKey } from './_studentStore.js'

export const GUARDED_PUPIL_KEY_SCRIPT = `
if redis.call('EXISTS', KEYS[2]) == 1 or redis.call('EXISTS', KEYS[3]) == 1 then return 0 end
if ARGV[4] == 'live' and redis.call('EXISTS', KEYS[4]) == 0 then return 0 end
if ARGV[1] == 'member' then redis.call('SADD', KEYS[1], ARGV[2])
elseif ARGV[1] == 'score-member' then redis.call('SADD', KEYS[1], cjson.decode(ARGV[2]))
elseif ARGV[1] == 'reserve' then redis.call('SET', KEYS[1], ARGV[2], 'NX')
elseif tonumber(ARGV[3]) > 0 then redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
else redis.call('SET', KEYS[1], ARGV[2]) end
return 1
`

export async function guardPupilKey(key, id, value, { operation = 'set', ttl = 0, live = false, store = kv } = {}) {
  return Number(await store.eval(GUARDED_PUPIL_KEY_SCRIPT,
    [key, studentDeletedKey(id), `student_deleted:${id}`, `student:${id}`],
    [operation, operation === 'member' ? id : JSON.stringify(value), ttl, live ? 'live' : ''])) === 1
}

// Filter retired pupils inside the write transaction, including a request
// that read the old roster just before the lifecycle tombstone was created.
export const PUPIL_REFERENCE_WRITE_SCRIPT = `
local blocked = {}
local ids = cjson.decode(ARGV[2])
for i, id in ipairs(ids) do
  if redis.call('EXISTS', KEYS[i + 1]) == 1 then blocked[id] = true end
end
local function clean(value, field)
  if type(value) ~= 'table' then
    if (field == 'studentId' or field == 'pupilId') and blocked[string.upper(tostring(value))] then return cjson.null end
    return value
  end
  if value.studentId and blocked[string.upper(tostring(value.studentId))] then return cjson.null end
  local result = {}
  local isArray = #value > 0
  local iterator = isArray and ipairs or pairs
  for key, item in iterator(value) do
    if not (type(key) == 'string' and blocked[string.upper(key)]) then
      local referenceList = field == 'studentIds' or field == 'pupilIds' or field == 'targetStudentIds'
      if not (referenceList and blocked[string.upper(tostring(item))]) then
        local next = clean(item, tostring(key))
        if next ~= cjson.null then
          if isArray then table.insert(result, next) else result[key] = next end
        end
      end
    end
  end
  return result
end
local arrays = cjson.decode(ARGV[3])
local function encode(value, path)
  if type(value) ~= 'table' then return cjson.encode(value) end
  local items = {}
  if arrays[path] then
    for _, item in ipairs(value) do table.insert(items, encode(item, path .. '/*')) end
    return '[' .. table.concat(items, ',') .. ']'
  end
  for key, item in pairs(value) do table.insert(items, cjson.encode(tostring(key)) .. ':' .. encode(item, path .. '/' .. tostring(key))) end
  return '{' .. table.concat(items, ',') .. '}'
end
local value = clean(cjson.decode(ARGV[1]), '')
redis.call('SET', KEYS[1], encode(value, ''))
return 1
`

export function pupilReferences(value, field = '', ids = new Set()) {
  if (!value || typeof value !== 'object') return ids
  for (const [key, item] of Object.entries(value)) {
    if (['studentId', 'pupilId'].includes(key) && typeof item === 'string') ids.add(item.toUpperCase())
    if (['studentIds', 'pupilIds', 'targetStudentIds'].includes(key) && Array.isArray(item)) {
      for (const id of item) if (typeof id === 'string') ids.add(id.toUpperCase())
    }
    if (field === 'labels') ids.add(key.toUpperCase())
    pupilReferences(item, key, ids)
  }
  return ids
}

export async function writePupilReferences(key, value, { labels = false, store = kv } = {}) {
  const ids = [...pupilReferences(value, labels ? 'labels' : '')]
  const arrays = {}
  function arrayPaths(current, path = '') {
    if (!current || typeof current !== 'object') return
    if (Array.isArray(current)) arrays[path] = true
    for (const [field, child] of Object.entries(current)) arrayPaths(child, `${path}/${Array.isArray(current) ? '*' : field}`)
  }
  arrayPaths(value)
  return store.eval(PUPIL_REFERENCE_WRITE_SCRIPT, [key, ...ids.map(studentDeletedKey)],
    [JSON.stringify(value), JSON.stringify(ids), JSON.stringify(arrays)])
}

export function removePupilReferences(value, blocked, field = '') {
  if (!value || typeof value !== 'object') return value
  if (value.studentId && blocked.has(String(value.studentId).toUpperCase())) return null
  if (Array.isArray(value)) return value.filter(item => !(['studentIds', 'pupilIds', 'targetStudentIds'].includes(field)
    && blocked.has(String(item).toUpperCase()))).map(item => removePupilReferences(item, blocked)).filter(item => item !== null)
  return Object.fromEntries(Object.entries(value).filter(([key]) => !blocked.has(key.toUpperCase()))
    .map(([key, item]) => [key, removePupilReferences(item, blocked, key)]).filter(([, item]) => item !== null))
}
