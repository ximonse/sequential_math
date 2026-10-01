// In-memory stand-in for @vercel/kv used only by the click robots.
// It mirrors the Upstash client's behavior (JSON values in, parsed values out)
// and emulates the few Lua scripts the API runs through kv.eval.
import { STUDENT_CAS_SCRIPT } from '../api/_studentStore.js'
import { CREATE_DIAGNOSTIC_ASSIGNMENT_SCRIPT, OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT } from '../api/_diagnosticAssignmentStore.js'
import { DIAGNOSTIC_APPEND_CAS_SCRIPT } from '../api/_diagnosticAttemptStore.js'

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
  async lrange(key, start, end) { const list = values.get(key) || []; return clone(list.slice(start, end === -1 ? undefined : end + 1)) },
  async sadd(key, ...members) { const set = sets.get(key) || new Set(); sets.set(key, set); let n = 0; for (const m of members.flat()) { if (!set.has(m)) { set.add(m); n++ } } return n },
  async srem(key, ...members) { const set = sets.get(key); if (!set) return 0; let n = 0; for (const m of members.flat()) if (set.delete(m)) n++; return n },
  async eval(script, keys = [], args = []) {
    if (script === CREATE_DIAGNOSTIC_ASSIGNMENT_SCRIPT) {
      const [assignmentKey, deletedClassKey, classKey] = keys
      const [count, classId, json] = args
      if (values.has(assignmentKey)) return 0
      const klass = values.get(classKey)
      if (values.has(deletedClassKey) || !klass || klass.archived) return -2
      for (let index = 0; index < count; index++) {
        if (values.has(keys[3 + count + index]) || values.has(keys[3 + 2 * count + index])) return -3
        const pupil = values.get(keys[3 + index])
        if (!pupil) return -4
        if (pupil.classId !== classId && !pupil.classIds?.includes(classId)) return -5
      }
      const assignment = parse(json)
      values.set(assignmentKey, assignment)
      await kv.sadd(keys[3 + 3 * count], assignment.assignmentId)
      for (let index = 0; index < count; index++) {
        await kv.sadd(keys[4 + 3 * count + index], assignment.assignmentId)
      }
      return 1
    }
    if (script === OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT) {
      const [assignmentKey, studentKey, deletedKey, legacyDeletedKey, classDeletedKey,
        classKey, activeKey, attemptKey, eventsKey, studentIndexKey, assignmentIndexKey] = keys
      const [classId, version, studentId, itemId, taskId, taskVersion, json, attemptId] = args
      if (values.has(deletedKey) || values.has(legacyDeletedKey)) return '-deleted'
      const klass = values.get(classKey)
      if (values.has(classDeletedKey) || !klass || klass.archived) return '-class'
      const assignment = values.get(assignmentKey)
      if (!assignment) return '-missing'
      if (assignment.status !== 'active' || assignment.evidenceClass !== 'diagnostic_only'
        || assignment.classId !== classId || assignment.assignmentVersion !== version) return '-stopped'
      if (!assignment.studentIds.includes(studentId)) return '-unauthorized'
      if (!assignment.items.some(item => item.assignmentItemId === itemId && item.taskId === taskId
        && item.taskVersion === taskVersion)) return '-item'
      const student = values.get(studentKey)
      if (!student) return '-deleted'
      if (student.classId !== classId && !student.classIds?.includes(classId)) return '-class'
      const active = values.get(activeKey)
      if (active) return values.has(`diagnostic_attempt:${active}`) ? `existing:${active}` : '-broken'
      if (values.has(attemptKey) || values.has(eventsKey)) return '-collision'
      values.set(attemptKey, parse(json))
      values.set(activeKey, attemptId)
      await kv.sadd(studentIndexKey, attemptId)
      await kv.sadd(assignmentIndexKey, attemptId)
      return `created:${attemptId}`
    }
    if (script === DIAGNOSTIC_APPEND_CAS_SCRIPT) {
      const [attemptKey, eventsKey, deletedKey, legacyDeletedKey, classDeletedKey,
        assignmentKey, studentKey, classKey] = keys
      const [revision, sequence, nextJson, studentId, assignmentId, eventCount, ...eventJson] = args
      if (values.has(deletedKey) || values.has(legacyDeletedKey)) return -2
      if (values.has(classDeletedKey)) return -3
      const assignment = values.get(assignmentKey)
      if (assignment?.status !== 'active') return -9
      const current = values.get(attemptKey)
      if (!current) return -4
      if (current.studentId !== studentId || current.assignmentId !== assignmentId) return -5
      const student = values.get(studentKey)
      const klass = values.get(classKey)
      if (assignment.classId !== current.classIdAtAttempt || assignment.evidenceClass !== 'diagnostic_only'
        || !assignment.studentIds.includes(studentId)
        || !assignment.items.some(item => item.assignmentItemId === current.assignmentItemId
          && item.taskId === current.taskId && item.taskVersion === current.taskVersion)
        || !student || (student.classId !== assignment.classId && !student.classIds?.includes(assignment.classId))
        || !klass || klass.archived) return -9
      if (current.serverRevision !== revision || current.lastSequence !== sequence) return 0
      if (current.status !== 'in_progress') return -6
      if ((values.get(eventsKey) || []).length !== sequence) return -7
      const next = parse(nextJson)
      if (next.serverRevision !== revision + 1 || next.lastSequence !== sequence + eventCount) return -8
      values.set(eventsKey, [...(values.get(eventsKey) || []), ...eventJson.map(parse)])
      values.set(attemptKey, next)
      return 1
    }
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
