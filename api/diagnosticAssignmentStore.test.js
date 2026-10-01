import { beforeEach, describe, expect, it } from 'vitest'
import { appendDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { createDiagnosticAssignment, openDiagnosticAttempt,
  CREATE_DIAGNOSTIC_ASSIGNMENT_SCRIPT, OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT } from './_diagnosticAssignmentStore.js'
import { DIAGNOSTIC_APPEND_CAS_SCRIPT } from './_diagnosticAttemptStore.js'
import { recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { studentDeletedKey } from './_studentStore.js'

const clone = value => value === undefined ? undefined : structuredClone(value)

function storage() {
  const data = new Map([
    ['class:CLASS', { id: 'CLASS', archived: false }],
    ['student:PUPIL', { studentId: 'PUPIL', classIds: ['CLASS'] }],
    ['student:OTHER', { studentId: 'OTHER', classIds: ['OTHER_CLASS'] }]
  ])
  const store = {
    data,
    get: async key => clone(data.get(key) ?? null),
    exists: async key => Number(data.has(key)),
    lrange: async (key, start) => clone((data.get(key) || []).slice(start)),
    eval: async (script, keys, args) => {
      if (script === CREATE_DIAGNOSTIC_ASSIGNMENT_SCRIPT) {
        const [assignmentKey, deletedClassKey, classKey] = keys
        const [count, classId, json] = args
        if (data.has(assignmentKey)) return 0
        if (data.has(deletedClassKey) || !data.has(classKey) || data.get(classKey).archived) return -2
        for (let index = 0; index < count; index++) {
          if (data.has(keys[3 + count + index]) || data.has(keys[3 + 2 * count + index])) return -3
          const pupil = data.get(keys[3 + index])
          if (!pupil) return -4
          if (pupil.classId !== classId && !pupil.classIds?.includes(classId)) return -5
        }
        data.set(assignmentKey, JSON.parse(json))
        const indexKey = keys[3 + 3 * count]
        data.set(indexKey, [...new Set([...(data.get(indexKey) || []), JSON.parse(json).assignmentId])])
        for (let index = 0; index < count; index++) {
          const pupilIndex = keys[4 + 3 * count + index]
          data.set(pupilIndex, [...new Set([...(data.get(pupilIndex) || []), JSON.parse(json).assignmentId])])
        }
        return 1
      }
      if (script === OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT) {
        const [assignmentKey, studentKey, deletedKey, legacyDeletedKey, classDeletedKey, classKey,
          activeKey, attemptKey, eventsKey, studentIndexKey, assignmentIndexKey] = keys
        const [classId, version, studentId, itemId, taskId, taskVersion, json, attemptId] = args
        if (data.has(deletedKey) || data.has(legacyDeletedKey)) return '-deleted'
        if (data.has(classDeletedKey) || !data.has(classKey) || data.get(classKey).archived) return '-class'
        const assignment = data.get(assignmentKey)
        if (!assignment) return '-missing'
        if (assignment.status !== 'active' || assignment.evidenceClass !== 'diagnostic_only'
          || assignment.classId !== classId || assignment.assignmentVersion !== version) return '-stopped'
        if (!assignment.studentIds.includes(studentId)) return '-unauthorized'
        if (!assignment.items.some(item => item.assignmentItemId === itemId && item.taskId === taskId && item.taskVersion === taskVersion)) return '-item'
        const pupil = data.get(studentKey)
        if (!pupil) return '-deleted'
        if (pupil.classId !== classId && !pupil.classIds?.includes(classId)) return '-class'
        const active = data.get(activeKey)
        if (active) return data.has(`diagnostic_attempt:${active}`) ? `existing:${active}` : '-broken'
        if (data.has(attemptKey) || data.has(eventsKey)) return '-collision'
        data.set(attemptKey, JSON.parse(json))
        data.set(activeKey, attemptId)
        data.set(studentIndexKey, [...new Set([...(data.get(studentIndexKey) || []), attemptId])])
        data.set(assignmentIndexKey, [...new Set([...(data.get(assignmentIndexKey) || []), attemptId])])
        return `created:${attemptId}`
      }
      if (script === DIAGNOSTIC_APPEND_CAS_SCRIPT) {
        const [attemptKey, eventsKey, deletedKey, legacyDeletedKey, classDeletedKey, assignmentKey,
          studentKey, classKey] = keys
        const [revision, sequence, nextJson, studentId, assignmentId, count, ...eventJson] = args
        if (data.has(deletedKey) || data.has(legacyDeletedKey)) return -2
        if (data.has(classDeletedKey)) return -3
        const activeAssignment = data.get(assignmentKey)
        if (activeAssignment?.status !== 'active') return -9
        const record = data.get(attemptKey)
        if (!record) return -4
        if (record.studentId !== studentId || record.assignmentId !== assignmentId) return -5
        if (activeAssignment.classId !== record.classIdAtAttempt || activeAssignment.evidenceClass !== 'diagnostic_only'
          || !activeAssignment.studentIds.includes(studentId)
          || !activeAssignment.items.some(item => item.assignmentItemId === record.assignmentItemId
            && item.taskId === record.taskId && item.taskVersion === record.taskVersion)
          || !data.has(classKey) || data.get(classKey).archived
          || !data.has(studentKey) || !data.get(studentKey).classIds.includes(activeAssignment.classId)) return -9
        if (record.serverRevision !== revision || record.lastSequence !== sequence) return 0
        if (record.status !== 'in_progress') return -6
        if ((data.get(eventsKey) || []).length !== sequence) return -7
        const next = JSON.parse(nextJson)
        if (next.serverRevision !== revision + 1 || next.lastSequence !== sequence + count) return -8
        data.set(eventsKey, [...(data.get(eventsKey) || []), ...eventJson.map(JSON.parse)])
        data.set(attemptKey, next)
        return 1
      }
      throw new Error('Unexpected storage script')
    }
  }
  return store
}

let store
let id
beforeEach(() => {
  store = storage()
  let next = 0
  id = () => `server-id-${++next}`
})

const create = (overrides = {}) => createDiagnosticAssignment({ classId: 'CLASS', studentIds: ['PUPIL'],
  taskIds: ['add-no-carry-001', 'sub-through-zero-001'], teacherId: 'TEACHER', ...overrides }, { store, makeId: id })
const open = (assignment, item = assignment.items[0], studentId = 'PUPIL') => openDiagnosticAttempt({
  assignmentId: assignment.assignmentId, assignmentItemId: item.assignmentItemId, studentId
}, { store, makeId: id })

describe('diagnostic assignment and attempt creation', () => {
  it('freezes original tasks and atomically reuses one active attempt across devices', async () => {
    const profileBefore = clone(store.data.get('student:PUPIL'))
    const assignment = await create()
    expect(assignment).toMatchObject({ evidenceClass: 'diagnostic_only', manifestVersion: 1,
      instructionSv: 'Visa hur du räknar i rutorna. Skriv också ditt svar.', status: 'active' })
    expect(assignment.items.map(item => item.taskSnapshot.promptSv)).toEqual([
      'Räkna ut 268 + 431.', 'Räkna ut 402 − 178.'
    ])
    const [first, second] = await Promise.all([open(assignment), open(assignment)])
    expect([first.kind, second.kind].sort()).toEqual(['created', 'existing'])
    expect(first.record.attemptId).toBe(second.record.attemptId)
    expect(Number.isFinite(first.record.createdAt)).toBe(true)
    expect(second.record.createdAt).toBe(first.record.createdAt)
    expect(first.snapshot.events).toEqual([])
    expect(store.data.get(`diagnostic_attempts_by_student:PUPIL`)).toEqual([first.record.attemptId])
    expect(store.data.get(`diagnostic_attempts_by_assignment:${assignment.assignmentId}`)).toEqual([first.record.attemptId])
    expect(store.data.get('diagnostic_assignments_by_class:CLASS')).toEqual([assignment.assignmentId])
    expect(store.data.get('diagnostic_assignments_by_student:PUPIL')).toEqual([assignment.assignmentId])
    expect(store.data.get('student:PUPIL')).toEqual(profileBefore)
  })

  it('resumes a written attempt with the same grid and does not create another', async () => {
    const assignment = await create()
    const first = await open(assignment)
    const event = recordDiagnosticGridEvent(first.snapshot, { type: 'write', position: { row: 0, column: 0 },
      layer: 'main', before: '', after: '8' }, 1000).events[0]
    await appendDiagnosticAttempt({ attemptId: first.record.attemptId, studentId: 'PUPIL',
      expectedRevision: 0, events: [event] }, { store })
    const resumed = await open(assignment)
    expect(resumed.kind).toBe('existing')
    expect(resumed.record.serverRevision).toBe(1)
    expect(resumed.snapshot.cells['0:0'].main).toBe('8')
  })

  it('rejects unknown tasks, changed class membership and tombstones without partial creation', async () => {
    await expect(create({ taskIds: ['not-in-manifest'] })).rejects.toMatchObject({ status: 400 })
    await expect(create({ studentIds: ['OTHER'] })).rejects.toMatchObject({ status: 409 })
    expect([...store.data.keys()].filter(key => key.startsWith('diagnostic_assignment:'))).toEqual([])
    expect([...store.data.keys()].filter(key => key.startsWith('diagnostic_assignments_by_'))).toEqual([])
    const assignment = await create()
    store.data.get('student:PUPIL').classIds = []
    await expect(open(assignment)).rejects.toMatchObject({ status: 410 })
    store.data.get('student:PUPIL').classIds = ['CLASS']
    store.data.set(studentDeletedKey('PUPIL'), 'deleted')
    await expect(open(assignment)).rejects.toMatchObject({ status: 410 })
    expect([...store.data.keys()].filter(key => key.startsWith('diagnostic_attempt:'))).toEqual([])
  })

  it('indexes one frozen assignment for every target pupil in the same atomic step', async () => {
    store.data.get('student:OTHER').classIds = ['CLASS']
    const assignment = await create({ studentIds: ['PUPIL', 'OTHER'] })
    expect(store.data.get('diagnostic_assignments_by_student:PUPIL')).toEqual([assignment.assignmentId])
    expect(store.data.get('diagnostic_assignments_by_student:OTHER')).toEqual([assignment.assignmentId])
    expect(store.data.get('diagnostic_assignments_by_class:CLASS')).toEqual([assignment.assignmentId])
  })

  it('rejects a stopped assignment even when the caller read it before the atomic step', async () => {
    const assignment = await create()
    const realEval = store.eval
    store.eval = async (script, keys, args) => {
      if (script === OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT) store.data.get(`diagnostic_assignment:${assignment.assignmentId}`).status = 'stopped'
      return realEval(script, keys, args)
    }
    await expect(open(assignment)).rejects.toMatchObject({ status: 410 })
    expect([...store.data.keys()].filter(key => key.startsWith('diagnostic_attempt:'))).toEqual([])
  })
})
