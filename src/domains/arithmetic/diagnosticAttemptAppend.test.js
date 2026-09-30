import { describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import {
  DiagnosticAppendError,
  MAX_DIAGNOSTIC_APPEND_BYTES,
  MAX_DIAGNOSTIC_ATTEMPT_EVENTS,
  prepareDiagnosticAppend
} from './diagnosticAttemptAppend.js'

const position = { row: 0, column: 0 }
const initial = () => createDiagnosticGrid({ attemptId: 'attempt-a', taskId: 'add-no-carry-001', taskVersion: 1 })
const write = (snapshot, after, timestamp = 1000) => recordDiagnosticGridEvent(snapshot,
  { type: 'write', position, layer: 'main', before: snapshot.cells['0:0']?.main || '', after }, timestamp)
const event = (snapshot, after) => write(snapshot, after).events.at(-1)

function expectAppendError(action, code, status) {
  expect(action).toThrowError(DiagnosticAppendError)
  try { action() } catch (error) { expect(error).toMatchObject({ code, status }) }
}

describe('prepareDiagnosticAppend', () => {
  it('keeps sequential writes and a submitted snapshot replayable without changing the input', () => {
    const start = initial()
    const first = event(start, '8')
    const one = prepareDiagnosticAppend({ snapshot: start, serverRevision: 0, expectedRevision: 0, events: [first] })
    expect(one).toMatchObject({ kind: 'append', serverRevision: 1, ack: ['attempt-a:1'] })
    expect(start.events).toEqual([])
    const second = event(one.snapshot, '9')
    const submitted = recordDiagnosticGridEvent(write(one.snapshot, '9'), { type: 'submit' }, 1001).events.at(-1)
    const two = prepareDiagnosticAppend({ snapshot: one.snapshot, serverRevision: 1, expectedRevision: 1,
      events: [second, submitted] })
    expect(two.snapshot).toMatchObject({ status: 'submitted', cells: { '0:0': { main: '9', note: '' } } })
    expect(two.snapshot.events.map(item => item.sequence)).toEqual([1, 2, 3])
  })

  it('acknowledges an exact retry but rejects a changed duplicate or stale new work', () => {
    const start = initial()
    const first = event(start, '8')
    const saved = prepareDiagnosticAppend({ snapshot: start, serverRevision: 0, expectedRevision: 0, events: [first] })
    expect(prepareDiagnosticAppend({ snapshot: saved.snapshot, serverRevision: 1,
      expectedRevision: 0, events: [first] })).toMatchObject({ kind: 'duplicate', serverRevision: 1 })
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: saved.snapshot, serverRevision: 1,
      expectedRevision: 0, events: [{ ...first, after: '7' }] }), 'revision_conflict', 409)
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: saved.snapshot, serverRevision: 1,
      expectedRevision: 0, events: [event(saved.snapshot, '9')] }), 'revision_conflict', 409)
  })

  it('rejects sequence gaps and partial batches without accepting any event', () => {
    const start = initial()
    const first = event(start, '8')
    const second = { ...first, sequence: 3, eventId: 'attempt-a:3' }
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: start, serverRevision: 0,
      expectedRevision: 0, events: [first, second] }), 'revision_conflict', 409)
    expect(start.events).toEqual([])
  })

  it('rejects a wrong attempt, a corrupt stored snapshot and oversized input', () => {
    const start = initial()
    const first = event(start, '8')
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: start, serverRevision: 0,
      expectedRevision: 0, events: [{ ...first, attemptId: 'other' }] }), 'revision_conflict', 409)
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: { ...start, cells: { '0:0': { main: '9', note: '' } } },
      serverRevision: 0, expectedRevision: 0, events: [first] }), 'corrupt_snapshot', 409)
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: start, serverRevision: 0,
      expectedRevision: 0, events: [{ ...first, padding: 'x'.repeat(MAX_DIAGNOSTIC_APPEND_BYTES) }] }),
    'batch_too_large', 413)
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: start, serverRevision: 0,
      expectedRevision: 0, events: [{ ...first, padding: 'hidden data' }] }), 'invalid_event', 400)
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: start, serverRevision: 0,
      expectedRevision: 0, events: [{ ...first, position: { ...position, padding: 'hidden data' } }] }),
    'invalid_event', 400)
  })

  it('refuses new writes after submission and after the event limit', () => {
    const start = initial()
    const submitted = recordDiagnosticGridEvent(start, { type: 'submit' }, 1000)
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: submitted, serverRevision: 1,
      expectedRevision: 1, events: [{ ...submitted.events[0], sequence: 2, eventId: 'attempt-a:2' }] }),
    'revision_conflict', 409)
    const full = { ...start, events: Array.from({ length: MAX_DIAGNOSTIC_ATTEMPT_EVENTS }, (_, index) => ({
      type: 'pause', attemptId: 'attempt-a', eventId: `attempt-a:${index + 1}`, sequence: index + 1, timestamp: 1000 + index
    })) }
    expectAppendError(() => prepareDiagnosticAppend({ snapshot: full, serverRevision: 1,
      expectedRevision: 1, events: [{ type: 'pause', attemptId: 'attempt-a', eventId: 'attempt-a:1025',
        sequence: 1025, timestamp: 3000 }] }), 'attempt_too_large', 413)
  })
})
