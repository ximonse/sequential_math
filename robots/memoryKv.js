// In-memory stand-in for @vercel/kv used only by the click robots.
// It mirrors the Upstash client's behavior (JSON values in, parsed values out)
// and emulates the few Lua scripts the API runs through kv.eval.
import { STUDENT_CAS_SCRIPT } from '../api/_studentStore.js'
import { CREATE_DIAGNOSTIC_ASSIGNMENT_SCRIPT, OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT } from '../api/_diagnosticAssignmentStore.js'
import { DIAGNOSTIC_APPEND_CAS_SCRIPT } from '../api/_diagnosticAttemptStore.js'
import { DIAGNOSTIC_REVIEW_CAS_SCRIPT } from '../api/_diagnosticReviewStore.js'
import { SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT } from '../api/_diagnosticCollectionStore.js'
import { BEGIN_PUPIL_LIFECYCLE_SCRIPT, FINISH_PUPIL_LIFECYCLE_SCRIPT } from '../api/_pupilLifecycle.js'
import { PUPIL_REFERENCE_WRITE_SCRIPT, GUARDED_PUPIL_KEY_SCRIPT, removePupilReferences } from '../api/_pupilReferenceWrite.js'

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
  async scan(_cursor, { match } = {}) {
    const expression = new RegExp('^' + String(match || '*').split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
    return [0, [...new Set([...values.keys(), ...sets.keys()])].filter(key => expression.test(key))]
  },
  async incr(key) { const next = Number(values.get(key) || 0) + 1; values.set(key, next); return next },
  async expire() { return 1 },
  async smembers(key) { return [...(sets.get(key) || [])] },
  async lrange(key, start, end) { const list = values.get(key) || []; return clone(list.slice(start, end === -1 ? undefined : end + 1)) },
  async sadd(key, ...members) { const set = sets.get(key) || new Set(); sets.set(key, set); let n = 0; for (const m of members.flat()) { if (!set.has(m)) { set.add(m); n++ } } return n },
  async srem(key, ...members) { const set = sets.get(key); if (!set) return 0; let n = 0; for (const m of members.flat()) if (set.delete(m)) n++; return n },
  async eval(script, keys = [], args = []) {
    if (script === SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT) {
      const [deleted, legacyDeleted, classDeleted, classKey, assignmentKey, pupilKey] = keys
      const [studentId, raw] = args
      const proposals = parse(raw), assignment = values.get(assignmentKey), pupil = values.get(pupilKey)
      if ([deleted, legacyDeleted, classDeleted].some(key => values.has(key))
        || !values.get(classKey) || values.get(classKey).archived || !pupil || !assignment
        || assignment.status !== 'active' || assignment.evidenceClass !== 'diagnostic_only'
        || assignment.items.length !== proposals.length || !assignment.studentIds.includes(studentId)
        || (pupil.classId !== assignment.classId && !pupil.classIds?.includes(assignment.classId))) return -1
      for (const [i, proposal] of proposals.entries()) {
        const record = values.get(keys[6 + 2*i]), item = assignment.items[i]
        if (!record) return -2
        if (record.studentId !== studentId || record.assignmentId !== assignment.assignmentId
          || record.assignmentItemId !== item.assignmentItemId || record.taskId !== item.taskId
          || record.taskVersion !== item.taskVersion || record.classIdAtAttempt !== assignment.classId
          || record.evidenceClass !== 'diagnostic_only') return -1
        if (record.serverRevision !== proposal.revision || record.lastSequence !== proposal.sequence
          || (values.get(keys[7 + 2*i]) || []).length !== proposal.sequence
          || (proposal.next && record.status !== 'in_progress')) return -2
      }
      for (const [i, proposal] of proposals.entries()) if (proposal.next) {
        const events = values.get(keys[7 + 2*i]) || []
        values.set(keys[7 + 2*i], [...events, parse(proposal.eventJson)])
        values.set(keys[6 + 2*i], parse(proposal.nextJson))
      }
      return 1
    }
    if (script === DIAGNOSTIC_REVIEW_CAS_SCRIPT) {
      const [attemptKey, reviewKey, deletedKey, legacyDeletedKey, classDeletedKey, pupilKey, classKey, assignmentKey] = keys
      const [revision, sequence, reviewRevision, studentId, json] = args
      const record = values.get(attemptKey), pupil = values.get(pupilKey)
      const klass = values.get(classKey), assignment = values.get(assignmentKey)
      if (values.has(deletedKey) || values.has(legacyDeletedKey) || values.has(classDeletedKey)
        || !record || !pupil || !klass || !assignment || klass.archived
        || record.studentId !== studentId || record.assignmentId !== assignment.assignmentId
        || record.classIdAtAttempt !== assignment.classId || record.evidenceClass !== 'diagnostic_only'
        || (pupil.classId !== assignment.classId && !pupil.classIds?.includes(assignment.classId))
        || !assignment.studentIds.includes(studentId)
        || !assignment.items.some(item => item.assignmentItemId === record.assignmentItemId
          && item.taskId === record.taskId && item.taskVersion === record.taskVersion)) return -1
      if (record.serverRevision !== Number(revision) || record.lastSequence !== Number(sequence)) return -2
      if ((values.get(reviewKey)?.reviewRevision || 0) !== Number(reviewRevision)) return -3
      values.set(reviewKey, parse(json))
      return 1
    }
    if (script === GUARDED_PUPIL_KEY_SCRIPT) {
      if (values.has(keys[1]) || values.has(keys[2]) || (args[3] === 'live' && !values.has(keys[3]))) return 0
      if (args[0] === 'member') await kv.sadd(keys[0], args[1])
      else if (args[0] === 'score-member') await kv.sadd(keys[0], parse(args[1]))
      else if (args[0] !== 'reserve' || !values.has(keys[0])) values.set(keys[0], parse(args[1]))
      return 1
    }
    if (script === PUPIL_REFERENCE_WRITE_SCRIPT) {
      const ids = parse(args[1])
      const blocked = new Set(ids.filter((_id, index) => values.has(keys[index + 1])))
      values.set(keys[0], removePupilReferences(parse(args[0]), blocked))
      return 1
    }
    if (script === BEGIN_PUPIL_LIFECYCLE_SCRIPT) {
      const [profileKey, deletedKey, jobKey, indexKey, pendingKey] = keys
      const [revision, json, timestamp, id] = args
      if (values.has(jobKey)) return 2
      if (values.has(deletedKey)) return -2
      const profile = values.get(profileKey)
      if (!profile) return -1
      if ((profile.serverRevision || 0) !== Number(revision)) return 0
      values.set(jobKey, { ...parse(json), profile: clone(profile) })
      values.set(deletedKey, timestamp)
      values.delete(profileKey)
      await kv.srem(indexKey, id)
      await kv.sadd(pendingKey, id)
      return 1
    }
    if (script === FINISH_PUPIL_LIFECYCLE_SCRIPT) {
      const [jobKey, pendingKey, archiveKey, archiveIndex] = keys
      const [json, archiveJson, id, archiveId] = args
      if (!values.has(jobKey)) return 2
      const plan = parse(json)
      const stable = value => value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
        : Array.isArray(value) ? value.map(stable) : value
      for (const patch of plan.patches) {
        if (JSON.stringify(stable(values.get(patch.key) ?? null)) !== JSON.stringify(stable(patch.before))) return 0
      }
      for (const patch of plan.patches) {
        if (patch.after === null) values.delete(patch.key)
        else values.set(patch.key, clone(patch.after))
      }
      await kv.del(...plan.deletes)
      for (const removal of plan.removals) await kv.srem(removal.key, removal.member)
      if (archiveJson) { values.set(archiveKey, parse(archiveJson)); await kv.sadd(archiveIndex, archiveId) }
      values.delete(jobKey)
      await kv.srem(pendingKey, id)
      return 1
    }
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
        for (const pupilKey of keys.slice(3)) if (values.has(pupilKey)) return -4
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
