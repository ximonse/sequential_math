import { beforeEach, describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { appendDiagnosticAttempt, readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { studentDeletedKey } from './_studentStore.js'

const attemptId = 'attempt-a'
const studentId = 'PUPIL'
const assignmentId = 'assignment-a'
const position = { row: 0, column: 0 }
const copy = value => value === undefined ? undefined : structuredClone(value)

function storeFixture() {
  const data = new Map()
  const store = {
    data,
    get: async key => copy(data.get(key) ?? null),
    lrange: async (key, start) => copy((data.get(key) || []).slice(start)),
    exists: async key => Number(data.has(key)),
    eval: async (_script, keys, args) => {
      const [headerKey, eventKey, deletedKey, legacyDeletedKey, classDeletedKey, assignmentKey,
        studentKey, classKey] = keys
      const [expectedRevision, lastSequence, nextJson, pupil, assignment, eventCount, ...eventJson] = args
      if (data.has(deletedKey) || data.has(legacyDeletedKey)) return -2
      if (data.has(classDeletedKey)) return -3
      const activeAssignment = data.get(assignmentKey)
      if (activeAssignment?.status !== 'active') return -9
      const current = data.get(headerKey)
      if (!current) return -4
      if (current.studentId !== pupil || current.assignmentId !== assignment) return -5
      if (activeAssignment.classId !== current.classIdAtAttempt || activeAssignment.evidenceClass !== 'diagnostic_only'
        || !activeAssignment.studentIds.includes(pupil)
        || !activeAssignment.items.some(item => item.assignmentItemId === current.assignmentItemId
          && item.taskId === current.taskId && item.taskVersion === current.taskVersion)
        || !data.has(classKey) || data.get(classKey).archived
        || !data.has(studentKey) || !data.get(studentKey).classIds.includes(activeAssignment.classId)) return -9
      if (current.serverRevision !== expectedRevision || current.lastSequence !== lastSequence) return 0
      if (current.status !== 'in_progress') return -6
      if ((data.get(eventKey) || []).length !== lastSequence) return -7
      const next = JSON.parse(nextJson)
      if (next.serverRevision !== expectedRevision + 1 || next.lastSequence !== lastSequence + eventCount) return -8
      data.set(eventKey, [...(data.get(eventKey) || []), ...eventJson.map(JSON.parse)])
      data.set(headerKey, next)
      return 1
    }
  }
  const grid = createDiagnosticGrid({ attemptId, taskId: 'add-no-carry-001', taskVersion: 1 })
  data.set(`diagnostic_attempt:${attemptId}`, {
    attemptId, studentId, assignmentId, assignmentItemId: 'item-a', classIdAtAttempt: 'class-a',
    taskId: grid.taskId, taskVersion: grid.taskVersion, evidenceClass: 'diagnostic_only',
    serverRevision: 0, lastSequence: 0, status: 'in_progress', grid: copy(grid)
  })
  data.set(`diagnostic_attempt_events:${attemptId}`, [])
  data.set(`diagnostic_assignment:${assignmentId}`, { assignmentId, classId: 'class-a', status: 'active',
    evidenceClass: 'diagnostic_only', studentIds: [studentId], items: [{ assignmentItemId: 'item-a',
      taskId: grid.taskId, taskVersion: grid.taskVersion }] })
  data.set(`student:${studentId}`, { studentId, classIds: ['class-a'] })
  data.set('class:class-a', { id: 'class-a' })
  return store
}

const write = (grid, after) => recordDiagnosticGridEvent(grid,
  { type: 'write', position, layer: 'main', before: grid.cells['0:0']?.main || '', after }, 1000).events.at(-1)
const append = (store, events, expectedRevision = 0, pupil = studentId) => appendDiagnosticAttempt(
  { attemptId, studentId: pupil, expectedRevision, events }, { store })

let store
beforeEach(() => { store = storeFixture() })

describe('diagnostic attempt storage boundary', () => {
  it('stores the ordered events and final image separately and restores them after reopening', async () => {
    const initial = (await readDiagnosticAttempt(attemptId, { store })).snapshot
    const first = write(initial, '8')
    expect(await append(store, [first])).toMatchObject({ kind: 'append', serverRevision: 1, ack: ['attempt-a:1'] })
    const reopened = await readDiagnosticAttempt(attemptId, { store })
    expect(reopened.snapshot.cells['0:0'].main).toBe('8')
    expect(reopened.snapshot.events).toEqual([first])
    expect(reopened.record.grid.events).toBeUndefined()
    const submit = recordDiagnosticGridEvent(reopened.snapshot, { type: 'submit' }, 1001).events.at(-1)
    expect(await append(store, [submit], 1)).toMatchObject({ serverRevision: 2, ack: ['attempt-a:2'] })
    expect((await readDiagnosticAttempt(attemptId, { store })).snapshot.status).toBe('submitted')
    await expect(append(store, [submit], 1)).resolves.toMatchObject({ kind: 'duplicate', serverRevision: 2 })
  })

  it('allows exactly one writer for the same next revision and never partially appends', async () => {
    const first = write((await readDiagnosticAttempt(attemptId, { store })).snapshot, '8')
    const rival = { ...first, after: '9' }
    const results = await Promise.allSettled([append(store, [first]), append(store, [rival])])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')[0].reason).toMatchObject({ status: 409 })
    expect((await readDiagnosticAttempt(attemptId, { store })).snapshot.events).toHaveLength(1)
    await expect(append(store, [first], 0)).resolves.toMatchObject({ kind: 'duplicate', ack: [first.eventId] })
    const saved = store.data.get(`diagnostic_attempt_events:${attemptId}`)
    expect(saved).toHaveLength(1)
  })

  it('rejects gaps, wrong pupil, corrupt saved state and deleted identities', async () => {
    const first = write((await readDiagnosticAttempt(attemptId, { store })).snapshot, '8')
    await expect(append(store, [{ ...first, sequence: 2, eventId: 'attempt-a:2' }]))
      .rejects.toMatchObject({ status: 409 })
    await expect(append(store, [first], 0, 'OTHER')).rejects.toMatchObject({ status: 403 })
    store.data.get(`diagnostic_attempt:${attemptId}`).grid.cells = { '0:0': { main: '9', note: '' } }
    await expect(append(store, [first])).rejects.toMatchObject({ code: 'corrupt_snapshot' })
    store = storeFixture()
    store.data.set(studentDeletedKey(studentId), 'deleted')
    await expect(append(store, [first])).rejects.toMatchObject({ status: 410 })
    await expect(readDiagnosticAttempt(attemptId, { store })).rejects.toMatchObject({ status: 410 })
  })

  it('detects a revision change inside the atomic store operation', async () => {
    const first = write((await readDiagnosticAttempt(attemptId, { store })).snapshot, '8')
    const realEval = store.eval
    store.eval = async (...args) => {
      store.data.get(`diagnostic_attempt:${attemptId}`).serverRevision = 1
      return realEval(...args)
    }
    await expect(append(store, [first])).rejects.toMatchObject({ status: 409, code: 'revision_conflict' })
    expect(store.data.get(`diagnostic_attempt_events:${attemptId}`)).toEqual([])
  })

  it('blocks a stopped assignment inside the atomic store operation', async () => {
    const first = write((await readDiagnosticAttempt(attemptId, { store })).snapshot, '8')
    const realEval = store.eval
    store.eval = async (...args) => {
      store.data.get(`diagnostic_assignment:${assignmentId}`).status = 'stopped'
      return realEval(...args)
    }
    await expect(append(store, [first])).rejects.toMatchObject({ status: 410 })
    expect(store.data.get(`diagnostic_attempt_events:${attemptId}`)).toEqual([])
  })

  it('blocks a pupil moved out of the class inside the atomic append', async () => {
    const first = write((await readDiagnosticAttempt(attemptId, { store })).snapshot, '8')
    const realEval = store.eval
    store.eval = async (...args) => {
      store.data.get(`student:${studentId}`).classIds = []
      return realEval(...args)
    }
    await expect(append(store, [first])).rejects.toMatchObject({ status: 410 })
    expect(store.data.get(`diagnostic_attempt_events:${attemptId}`)).toEqual([])
  })
})
