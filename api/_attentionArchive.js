import { kv } from '@vercel/kv'
import { studentDeletedKey, studentStoreError } from './_studentStore.js'
import { isValidAttentionResult } from '../src/lib/attentionHistory.js'

export const ATTENTION_ARCHIVE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 0 or redis.call('EXISTS', KEYS[2]) == 1 or redis.call('EXISTS', KEYS[3]) == 1 then return -1 end
local items = cjson.decode(ARGV[1])
for i, item in ipairs(items) do
  local raw = redis.call('GET', KEYS[i + 5])
  local old = raw and cjson.decode(raw) or nil
  if not old or (not old.final and (item.final or item.revision > old.revision)) then
    redis.call('SET', KEYS[i + 5], item.json)
  end
  redis.call('SADD', KEYS[4], item.id)
end
if ARGV[2] == '1' then redis.call('SET', KEYS[5], '1') end
return 1
`
export const attentionArchiveKey = (studentId, id) => `attention_pass:${studentId}:${id}`
export async function archiveAttentionEvents(studentId, profile, entries, { store = kv, now = Date.now(), migrate = false } = {}) {
  const incoming = entries.filter(entry => ['attention_result', 'attention_checkpoint'].includes(entry.type))
  if (!incoming.length && !migrate) return
  const migrated = await store.get(`attention_migrated:${studentId}`)
  if (migrated && !incoming.length) return
  const items = new Map()
  // Migrate before the profile cache can evict an older result. Never give the
  // client an ACK until durable archive writes succeeded. Retries are idempotent.
  for (const result of migrated ? [] : profile.attentionHistory || []) if (isValidAttentionResult(result)) {
    items.set(result.id, { result, revision: 0, final: true, storedAt: now })
  }
  for (const entry of incoming) {
    const result = entry.type === 'attention_result' ? entry.payload : entry.payload.result
    const canonical = profile.attentionHistory?.find(pass => pass.id === result.id)
    const next = { result: canonical || result, revision: entry.payload.revision || 0,
      final: Boolean(canonical) || entry.type === 'attention_result', storedAt: now }
    const previous = items.get(result.id)
    if (!previous || (!previous.final && (next.final || next.revision > previous.revision))) items.set(result.id, next)
  }
  const list = [...items.values()]
  // Bound Redis command size even when migrating 500 large historical records.
  // Only the last successful chunk marks migration complete; partial failure is retryable.
  for (let offset = 0; offset < list.length; offset += 10) {
    const chunk = list.slice(offset, offset + 10)
    const ok = await store.eval(ATTENTION_ARCHIVE_SCRIPT,
      [`student:${studentId}`, studentDeletedKey(studentId), `student_deleted:${studentId}`,
        `attention_passes:${studentId}`, `attention_migrated:${studentId}`, ...chunk.map(item => attentionArchiveKey(studentId, item.result.id))],
      [JSON.stringify(chunk.map(item => ({ id: item.result.id, revision: item.revision, final: item.final, json: JSON.stringify(item) }))), offset + 10 >= list.length ? '1' : '0'])
    if (Number(ok) !== 1) throw studentStoreError(409, 'Elevens fokusarkiv kunde inte sparas.')
  }
}

// The client freezes the ID manifest from the first page. Later writes cannot
// shift pages or hide a selected attempt. In-progress records are latest reads,
// not a database-wide transactional snapshot; each carries its own save time.
export async function readAttentionArchive(studentId, profile, { store = kv, after = '', asOf = Date.now(), limit = 100, ids: requestedIds = null } = {}) {
  const cached = new Map((profile.attentionHistory || []).map(result => [result.id, result]))
  const ids = requestedIds || [...new Set([...(await store.smembers(`attention_passes:${studentId}`) || []), ...cached.keys()])].sort()
  const pending = ids.filter(id => id > after)
  const selected = pending.slice(0, limit)
  const records = await Promise.all(selected.map(async id => {
    const archived = await store.get(attentionArchiveKey(studentId, id))
    if (archived) return archived
    if (cached.has(id)) return { result: cached.get(id), revision: 0, final: true, storedAt: null }
    throw studentStoreError(503, 'Fokusarkivet är ofullständigt. Försök igen.')
  }))
  return { records, asOf, next: pending.length > limit ? selected.at(-1) : null, ...(!requestedIds && !after ? { manifest: ids } : {}) }
}
