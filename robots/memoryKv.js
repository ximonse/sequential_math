// In-memory stand-in for @vercel/kv used only by the click robots.
// It mirrors the Upstash client's behavior (JSON values in, parsed values out)
// and emulates the few Lua scripts the API runs through kv.eval.
import { STUDENT_CAS_SCRIPT } from '../api/_studentStore.js'

const values = new Map()
const sets = new Map()

const clone = value => (value === undefined ? null : structuredClone(value))
const parse = raw => { try { return JSON.parse(raw) } catch { return raw } }

export const kv = {
  async get(key) { return values.has(key) ? clone(values.get(key)) : null },
  async set(key, value, options = {}) {
    if (options?.nx && values.has(key)) return null
    values.set(key, clone(value))
    return 'OK'
  },
  async del(...keys) { let n = 0; for (const key of keys.flat()) { if (values.delete(key) || sets.delete(key)) n++ } return n },
  async exists(...keys) { return keys.flat().filter(key => values.has(key) || sets.has(key)).length },
  async incr(key) { const next = Number(values.get(key) || 0) + 1; values.set(key, next); return next },
  async expire() { return 1 },
  async smembers(key) { return [...(sets.get(key) || [])] },
  async sadd(key, ...members) { const set = sets.get(key) || new Set(); sets.set(key, set); let n = 0; for (const m of members.flat()) { if (!set.has(m)) { set.add(m); n++ } } return n },
  async srem(key, ...members) { const set = sets.get(key); if (!set) return 0; let n = 0; for (const m of members.flat()) if (set.delete(m)) n++; return n },
  async eval(script, keys = [], args = []) {
    if (script === STUDENT_CAS_SCRIPT) {
      const [recordKey, deletedKey, indexKey] = keys
      const [expected, operation, payload, id] = args
      if (values.has(deletedKey)) return -2
      const current = values.get(recordKey)
      const version = current ? (Number(current.serverRevision) || 0) : -1
      if (version !== Number(expected)) return 0
      if (operation === 'delete') {
        values.set(deletedKey, payload); values.delete(recordKey); await kv.srem(indexKey, id)
      } else {
        const next = parse(payload)
        for (const classId of next?.classIds || []) if (values.has(`class_deleted:${classId}`)) return -3
        values.set(recordKey, next); await kv.sadd(indexKey, id)
      }
      return 1
    }
    if (/redis\.call\('INCR', KEYS\[1\]\)/.test(script) && keys.length === 1) return kv.incr(keys[0])
    throw new Error(`memoryKv: unsupported script ${String(script).slice(0, 60)}`)
  },
  _reset() { values.clear(); sets.clear() },
  _dump() { return { values: Object.fromEntries(values), sets: Object.fromEntries([...sets].map(([k, v]) => [k, [...v]])) } }
}

export default { kv }
