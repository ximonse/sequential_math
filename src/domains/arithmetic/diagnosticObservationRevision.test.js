import { describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { identifyDiagnosticObservationRevision } from './diagnosticObservationRevision.js'

const empty = () => createDiagnosticGrid({ attemptId: 'ATTEMPT', taskId: 'TASK', taskVersion: 1 })
const recordFor = (snapshot, serverRevision) => ({ attemptId: snapshot.attemptId,
  taskId: snapshot.taskId, taskVersion: snapshot.taskVersion, status: snapshot.status,
  evidenceClass: 'diagnostic_only', serverRevision, lastSequence: snapshot.events.length })

describe('saved diagnostic observation identity', () => {
  it('changes identity only after a server-confirmed append', () => {
    const first = empty()
    expect(identifyDiagnosticObservationRevision(recordFor(first, 0), first)).toMatchObject({
      observationRevisionId: 'ATTEMPT:r0:s0', serverRevision: 0, lastSequence: 0 })
    const next = recordDiagnosticGridEvent(first, { type: 'write', position: { row: 0, column: 0 },
      layer: 'main', before: '', after: '8' }, 1001)
    const ref = identifyDiagnosticObservationRevision(recordFor(next, 1), next)
    expect(ref.observationRevisionId).toBe('ATTEMPT:r1:s1')
    expect(identifyDiagnosticObservationRevision(recordFor(next, 1), JSON.parse(JSON.stringify(next)))).toEqual(ref)
  })

  it('rejects a stale header and tampered final grid', () => {
    const grid = recordDiagnosticGridEvent(empty(), { type: 'write', position: { row: 0, column: 0 },
      layer: 'main', before: '', after: '8' }, 1001)
    expect(() => identifyDiagnosticObservationRevision({ ...recordFor(grid, 1), lastSequence: 0 }, grid))
      .toThrow('revision')
    expect(() => identifyDiagnosticObservationRevision({ ...recordFor(grid, 1), status: 'submitted' }, grid))
      .toThrow('revision')
    expect(() => identifyDiagnosticObservationRevision(recordFor(grid, 1), { ...grid, cells: {} }))
      .toThrow('snapshot')
  })
})
