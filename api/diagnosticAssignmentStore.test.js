import { beforeEach, describe, expect, it } from 'vitest'
import { appendDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { createDiagnosticAssignment, copyDiagnosticAssignment, openDiagnosticAttempt, stopDiagnosticAssignment,
  CREATE_DIAGNOSTIC_ASSIGNMENT_SCRIPT, OPEN_DIAGNOSTIC_ATTEMPT_SCRIPT,
  STOP_DIAGNOSTIC_ASSIGNMENT_SCRIPT } from './_diagnosticAssignmentStore.js'
import { DIAGNOSTIC_APPEND_CAS_SCRIPT } from './_diagnosticAttemptStore.js'
import { recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { studentDeletedKey } from './_studentStore.js'
import { listPupilDiagnosticAssignments } from './_diagnosticAssignmentList.js'

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
      if (script === STOP_DIAGNOSTIC_ASSIGNMENT_SCRIPT) {
        const [classId, studentIds, json] = args
        const assignment = data.get(keys[0])
        if (!assignment || assignment.classId !== classId) return -1
        if (assignment.status !== 'active') return 0
        if (assignment.studentIds.join(',') !== studentIds) return -2
        data.set(keys[0], JSON.parse(json))
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
  it('confirms the same frozen dispatch on retry, rejects changed payloads and never revives deleted recipients', async () => {
    const input = { classId: 'CLASS', studentIds: ['PUPIL'], taskIds: ['add-no-carry-001'], teacherId: 'TEACHER' }
    const options = { store, makeId: id, assignmentId: 'retry-assignment', dispatchFingerprint: 'same-payload' }
    const first = await createDiagnosticAssignment(input, options)
    expect(await createDiagnosticAssignment(input, options)).toEqual(first)
    expect(store.data.get('diagnostic_assignments_by_class:CLASS')).toHaveLength(1)
    await expect(createDiagnosticAssignment(input, { ...options, dispatchFingerprint: 'changed-payload' })).rejects.toMatchObject({ status: 409 })
    store.data.set(studentDeletedKey('PUPIL'), true)
    await expect(createDiagnosticAssignment(input, options)).rejects.toMatchObject({ status: 410 })
    expect(store.data.get('student:PUPIL')).toEqual({ studentId: 'PUPIL', classIds: ['CLASS'] })
  })
  it('freezes original answer keys, hides them from pupils and preserves them when copying', async () => {
    const expected = [2.35]
    const assignment = await create({ taskIds: [], customTasks: [{ promptSv: 'Beräkna 5,63 - 3,28.', gridEnabled: true,
      answerKey: { format: 'number', expected, unit: 'kg' } }] })
    expected[0] = 999
    expect(assignment.items[0].taskSnapshot).toMatchObject({ answerType: 'text', answerRule: 'custom_facit', gridEnabled: true,
      answerKey: { format: 'number', expected: [2.35], unit: 'kg' } })
    const pupilBefore = clone(store.data.get('student:PUPIL'))
    const attempt = await open(assignment)
    expect(attempt.snapshot.answerType).toBe('text')
    const publicList = await listPupilDiagnosticAssignments(store.data.get('student:PUPIL'), {
      store: { ...store, smembers: async key => store.data.get(key) || [] } })
    expect(JSON.stringify(publicList)).not.toMatch(/answerKey|expected|custom_facit|2,35|2\.35/u)
    expect(store.data.get('student:PUPIL')).toEqual(pupilBefore)
    const copied = await copyDiagnosticAssignment({ classId: 'CLASS', studentIds: ['PUPIL'], teacherId: 'TEACHER',
      sourceClassId: 'CLASS', sourceAssignmentId: assignment.assignmentId }, { store, makeId: id })
    expect(copied.items[0].taskSnapshot).toEqual(assignment.items[0].taskSnapshot)
  })

  it('rejects invalid frozen keys before storing an assignment', async () => {
    const before = clone([...store.data.entries()])
    await expect(create({ taskIds: [], customTasks: [{ promptSv: 'Skriv ett bråk.',
      answerKey: { format: 'fraction', expected: [1, 0] } }] })).rejects.toMatchObject({ status: 400, code: 'invalid_answer_key' })
    expect([...store.data.entries()]).toEqual(before)
  })

  it('reuses frozen questions and settings for a new class without copying answers or reopening the source', async () => {
    const source = await create({ titleSv: 'Bråk och metod', taskIds: ['add-no-carry-001'],
      itemOptions: { 'add-no-carry-001': { answerType: 'text', gridEnabled: false, drawingEnabled: true } },
      customTasks: [{ promptSv: 'Förklara 6//2.', gridEnabled: true }, { promptSv: 'Rita din metod.', drawingEnabled: true }] })
    const attempt = await open(source)
    await stopDiagnosticAssignment({ classId: 'CLASS', assignmentId: source.assignmentId, teacherId: 'TEACHER' }, { store })
    const before = clone(store.data.get(`diagnostic_assignment:${source.assignmentId}`))
    store.data.set('class:OTHER_CLASS', { id: 'OTHER_CLASS', archived: false })
    const copied = await copyDiagnosticAssignment({ classId: 'OTHER_CLASS', studentIds: ['OTHER'], teacherId: 'NEW_TEACHER',
      sourceClassId: 'CLASS', sourceAssignmentId: source.assignmentId }, { store, makeId: id })
    expect(copied).toMatchObject({ titleSv: source.titleSv, classId: 'OTHER_CLASS', studentIds: ['OTHER'],
      teacherId: 'NEW_TEACHER', status: 'active', evidenceClass: 'diagnostic_only' })
    expect(copied.items.map(item => item.taskSnapshot)).toEqual(source.items.map(item => item.taskSnapshot))
    expect(copied.items.map(item => item.assignmentItemId)).not.toEqual(source.items.map(item => item.assignmentItemId))
    expect(copied.assignmentId).not.toBe(source.assignmentId)
    expect(copied).not.toHaveProperty('stoppedAt')
    expect(store.data.get(`diagnostic_assignment:${source.assignmentId}`)).toEqual(before)
    expect(store.data.get(`diagnostic_attempts_by_assignment:${source.assignmentId}`)).toEqual([attempt.record.attemptId])
    expect(store.data.has(`diagnostic_attempts_by_assignment:${copied.assignmentId}`)).toBe(false)
    const opened = await openDiagnosticAttempt({ assignmentId: copied.assignmentId,
      assignmentItemId: copied.items[0].assignmentItemId, studentId: 'OTHER' }, { store, makeId: id })
    expect(opened.snapshot.answer).toBe('')
    expect(opened.snapshot.events).toEqual([])
  })

  it('refuses an unavailable source, a missing frozen version or a destination pupil outside its class', async () => {
    const source = await create()
    const copy = changes => copyDiagnosticAssignment({ classId: 'CLASS', studentIds: ['PUPIL'], teacherId: 'TEACHER',
      sourceClassId: 'CLASS', sourceAssignmentId: source.assignmentId, ...changes }, { store, makeId: id })
    await expect(copy({ sourceClassId: 'WRONG' })).rejects.toMatchObject({ status: 404 })
    await expect(copy({ studentIds: ['OTHER'] })).rejects.toMatchObject({ status: 409 })
    const broken = clone(source)
    delete broken.items[0].taskSnapshot
    broken.items[0].taskVersion = 999
    store.data.set(`diagnostic_assignment:${source.assignmentId}`, broken)
    await expect(copy({})).rejects.toMatchObject({ status: 409, code: 'invalid_source' })
    store.data.set('class_deleted:CLASS', true)
    await expect(copy({})).rejects.toMatchObject({ status: 404 })
  })

  it('freezes selected answer types and surfaces, including a custom written question', async () => {
    const assignment = await create({ titleSv: 'Läxa 1', taskIds: ['add-no-carry-001'],
      itemOptions: { 'add-no-carry-001': { answerType: 'text', gridEnabled: false, drawingEnabled: true } },
      customTasks: [{ promptSv: 'Förklara din metod.', gridEnabled: true, drawingEnabled: false }] })
    expect(assignment.titleSv).toBe('Läxa 1')
    expect(assignment.items[0].taskSnapshot).toMatchObject({ answerType: 'text', gridEnabled: false, drawingEnabled: true })
    expect(assignment.items[1].taskSnapshot).toMatchObject({ answerType: 'text', answerRule: 'teacher_review',
      promptSv: 'Förklara din metod.', gridEnabled: true, drawingEnabled: false })
    expect((await open(assignment)).snapshot.answerType).toBe('text')
    await expect(create({ itemOptions: { 'add-no-carry-001': { drawingEnabled: 'yes' } } })).rejects.toMatchObject({ status: 400 })
  })
  it('freezes original tasks and atomically reuses one active attempt across devices', async () => {
    const profileBefore = clone(store.data.get('student:PUPIL'))
    const assignment = await create()
    expect(assignment).toMatchObject({ evidenceClass: 'diagnostic_only', manifestVersion: 2,
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

  it('stops an assignment so pupils can no longer write, while saved attempts stay', async () => {
    const assignment = await create()
    const first = await open(assignment)
    const stop = () => stopDiagnosticAssignment({ classId: 'CLASS', assignmentId: assignment.assignmentId, teacherId: 'TEACHER' }, { store })
    await expect(stopDiagnosticAssignment({ classId: 'OTHER_CLASS', assignmentId: assignment.assignmentId,
      teacherId: 'TEACHER' }, { store })).rejects.toMatchObject({ status: 404 })
    const stopped = await stop()
    expect(stopped).toMatchObject({ status: 'stopped', stoppedBy: 'TEACHER' })
    expect((await stop()).stoppedAt).toBe(stopped.stoppedAt)
    await expect(open(assignment)).rejects.toMatchObject({ status: 404 })
    const event = recordDiagnosticGridEvent(first.snapshot, { type: 'write', position: { row: 0, column: 0 },
      layer: 'main', before: '', after: '8' }, 1000).events[0]
    await expect(appendDiagnosticAttempt({ attemptId: first.record.attemptId, studentId: 'PUPIL',
      expectedRevision: 0, events: [event] }, { store })).rejects.toBeTruthy()
    expect(store.data.has(`diagnostic_attempt:${first.record.attemptId}`)).toBe(true)
  })

  it('does not restore a pupil removed while the stop was in flight', async () => {
    store.data.get('student:OTHER').classIds = ['CLASS']
    const assignment = await create({ studentIds: ['PUPIL', 'OTHER'] })
    const key = `diagnostic_assignment:${assignment.assignmentId}`
    const realEval = store.eval
    let raced = false
    store.eval = async (script, keys, args) => {
      if (script === STOP_DIAGNOSTIC_ASSIGNMENT_SCRIPT && !raced) {
        raced = true
        store.data.get(key).studentIds = ['PUPIL']
      }
      return realEval(script, keys, args)
    }
    await stopDiagnosticAssignment({ classId: 'CLASS', assignmentId: assignment.assignmentId, teacherId: 'TEACHER' }, { store })
    expect(store.data.get(key)).toMatchObject({ status: 'stopped', studentIds: ['PUPIL'] })
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
