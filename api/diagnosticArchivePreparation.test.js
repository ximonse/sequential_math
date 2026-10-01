import { describe, expect, it } from 'vitest'
import manifest from '../src/domains/arithmetic/diagnosticTasks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'
import { studentDeletedKey } from './_studentStore.js'
import { prepareFrozenDiagnosticSeries } from './_diagnosticArchivePreparation.js'

const task = manifest.tasks[0]
function fixture() {
  const data = new Map()
  const store = {
    data,
    exists: async key => Number(data.has(key)),
    get: async key => structuredClone(data.get(key) ?? null),
    smembers: async key => structuredClone(data.get(key) || []),
    lrange: async key => structuredClone(data.get(key) || [])
  }
  data.set(studentDeletedKey('PUPIL'), Date.now())
  data.set('diagnostic_attempts_by_student:PUPIL', ['ATTEMPT'])
  let grid = createDiagnosticGrid({ attemptId: 'ATTEMPT', taskId: task.taskId,
    taskVersion: task.taskVersion })
  grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: '699' }, 1000)
  data.set('diagnostic_attempt:ATTEMPT', { attemptId: 'ATTEMPT', studentId: 'PUPIL',
    classIdAtAttempt: 'CLASS', assignmentId: 'ASSIGNMENT', assignmentItemId: 'ITEM',
    taskId: task.taskId, taskVersion: task.taskVersion, evidenceClass: 'diagnostic_only',
    status: 'in_progress', createdAt: Date.UTC(2026, 2, 1), serverRevision: 1,
    lastSequence: 1, grid: { ...grid, events: undefined } })
  data.set('diagnostic_attempt_events:ATTEMPT', grid.events)
  data.set('diagnostic_assignment:ASSIGNMENT', { classId: 'CLASS', studentIds: ['PUPIL'],
    items: [{ assignmentItemId: 'ITEM', taskId: task.taskId,
      taskVersion: task.taskVersion, taskSnapshot: task }] })
  return store
}

describe('post-tombstone diagnostic archive preparation', () => {
  it('replays every raw attempt into an identity-free frozen series', async () => {
    const store = fixture()
    const series = await prepareFrozenDiagnosticSeries('PUPIL', { store })
    expect(series).toMatchObject({ status: 'frozen', points: [{ month: '2026-03',
      answerStatus: 'correct', taskId: task.taskId }] })
    expect(JSON.stringify(series)).not.toMatch(/PUPIL|CLASS|ASSIGNMENT|ATTEMPT|699|events|cells/u)
    expect(store.data.has('diagnostic_attempt:ATTEMPT')).toBe(true)
  })

  it('requires tombstone and refuses missing or corrupt raw evidence', async () => {
    const store = fixture()
    store.data.delete(studentDeletedKey('PUPIL'))
    await expect(prepareFrozenDiagnosticSeries('PUPIL', { store })).rejects.toThrow()
    store.data.set(studentDeletedKey('PUPIL'), Date.now())
    store.data.delete('diagnostic_attempt:ATTEMPT')
    await expect(prepareFrozenDiagnosticSeries('PUPIL', { store })).rejects.toThrow()
    store.data.set('diagnostic_attempt:ATTEMPT', fixture().data.get('diagnostic_attempt:ATTEMPT'))
    store.data.set('diagnostic_attempt_events:ATTEMPT', [])
    await expect(prepareFrozenDiagnosticSeries('PUPIL', { store })).rejects.toThrow()
  })

  it('rejects an assignment that no longer matches the archived pupil', async () => {
    const store = fixture()
    store.data.get('diagnostic_assignment:ASSIGNMENT').studentIds = ['OTHER']
    await expect(prepareFrozenDiagnosticSeries('PUPIL', { store })).rejects.toThrow()
  })
})
