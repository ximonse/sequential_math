import { beforeEach, describe, expect, it } from 'vitest'
import { kv } from '../robots/memoryKv.js'
import { createDiagnosticAssignment, openDiagnosticAttempt } from './_diagnosticAssignmentStore.js'
import { submitDiagnosticCollection, SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT } from './_diagnosticCollectionStore.js'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'

let assignment, opened, entries
beforeEach(async () => {
  kv._reset()
  await kv.set('class:CLASS', { id: 'CLASS' })
  await kv.set('student:PUPIL', { studentId: 'PUPIL', classIds: ['CLASS'] })
  let next = 0
  const options = { store: kv, makeId: () => `test-${++next}` }
  assignment = await createDiagnosticAssignment({ classId: 'CLASS', studentIds: ['PUPIL'],
    teacherId: 'TEACHER', taskIds: ['add-no-carry-001', 'sub-through-zero-001'] }, options)
  opened = await Promise.all(assignment.items.map(item => openDiagnosticAttempt({
    assignmentId: assignment.assignmentId, assignmentItemId: item.assignmentItemId, studentId: 'PUPIL'
  }, options)))
  entries = opened.map(item => ({ attemptId: item.record.attemptId, revision: 0, sequence: 0 }))
})
const submit = (attempts = entries, store = kv) => submitDiagnosticCollection({
  assignmentId: assignment.assignmentId, studentId: 'PUPIL', attempts
}, { store })

describe('atomic whole-collection submission', () => {
  it('can submit a full 1024-event original while keeping the writing quota unchanged', async () => {
    const key = `diagnostic_attempt:${entries[0].attemptId}`
    const record = await kv.get(key)
    let grid = createDiagnosticGrid({ attemptId: record.attemptId, taskId: record.taskId, taskVersion: record.taskVersion })
    for (let index = 0; index < 1024; index++) grid = recordDiagnosticGridEvent(grid, { type: 'focus_lost' }, index + 1)
    const { events, ...snapshot } = grid
    await kv.set(key, { ...record, grid: snapshot, lastSequence: 1024, serverRevision: 1 })
    await kv.set(`diagnostic_attempt_events:${record.attemptId}`, events)
    const result = await submit([{ ...entries[0], sequence: 1024, revision: 1 }, entries[1]])
    expect(result.attempts[0].snapshot.events).toHaveLength(1025)
    expect(result.attempts[0].snapshot.events.at(-1).type).toBe('submit')
  })
  it('freezes every original together and safely retries after a lost acknowledgement', async () => {
    const result = await submit()
    expect(result.attempts.map(item => item.snapshot.status)).toEqual(['submitted', 'submitted'])
    const persisted = await Promise.all(entries.map(item => readDiagnosticAttempt(item.attemptId, { store: kv })))
    expect(persisted.map(item => item.record.lastSequence)).toEqual([1, 1])
    await submit()
    expect((await readDiagnosticAttempt(entries[0].attemptId, { store: kv })).snapshot.events).toHaveLength(1)
    expect((await kv.get('student:PUPIL')).problemLog).toBeUndefined()
  })

  it('rejects missing, duplicated or stale questions without freezing any other question', async () => {
    await expect(submit(entries.slice(0, 1))).rejects.toMatchObject({ status: 400 })
    await expect(submit([entries[0], entries[0]])).rejects.toMatchObject({ status: 400 })
    await expect(submit([entries[0], { ...entries[1], revision: 9 }])).rejects.toMatchObject({ status: 409 })
    expect((await readDiagnosticAttempt(entries[0].attemptId, { store: kv })).record.status).toBe('in_progress')
  })

  it('checks all revisions inside the atomic boundary before writing the first question', async () => {
    const store = { ...kv, eval: async (script, keys, args) => {
      if (script === SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT) {
        const key = `diagnostic_attempt:${entries[1].attemptId}`
        await kv.set(key, { ...await kv.get(key), serverRevision: 1 })
      }
      return kv.eval(script, keys, args)
    } }
    await expect(submit(entries, store)).rejects.toMatchObject({ status: 409 })
    expect((await readDiagnosticAttempt(entries[0].attemptId, { store: kv })).record.status).toBe('in_progress')
    expect(await kv.lrange(`diagnostic_attempt_events:${entries[0].attemptId}`, 0, -1)).toEqual([])
  })

  it('rejects membership removal during submission without any partial write', async () => {
    const store = { ...kv, eval: async (script, keys, args) => {
      if (script === SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT) await kv.set('student:PUPIL', { studentId: 'PUPIL', classIds: [] })
      return kv.eval(script, keys, args)
    } }
    await expect(submit(entries, store)).rejects.toMatchObject({ status: 410 })
    expect((await readDiagnosticAttempt(entries[0].attemptId, { store: kv })).record.status).toBe('in_progress')
  })
})
