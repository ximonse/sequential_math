import { describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../domains/arithmetic/diagnosticGridModel.js'
import { recoverDiagnosticDraft } from './diagnosticDraftRecovery.js'

const start = () => createDiagnosticGrid({ attemptId: 'attempt-a', taskId: 'add-no-carry-001', taskVersion: 1 })
const write = (grid, digit) => recordDiagnosticGridEvent(grid, { type: 'write', position: { row: 0, column: 0 },
  layer: 'main', before: grid.cells['0:0']?.main || '', after: digit }, 1000)

describe('diagnostic draft recovery', () => {
  it('resumes a locally saved suffix after the exact server prefix', () => {
    const server = write(start(), '8')
    const local = write(server, '9')
    expect(recoverDiagnosticDraft(server, local)).toEqual({ snapshot: local, conflict: false })
  })

  it('takes a newer server snapshot when an older local draft was already acknowledged', () => {
    const local = write(start(), '8')
    const server = write(local, '9')
    expect(recoverDiagnosticDraft(server, local)).toEqual({ snapshot: server, conflict: false })
  })

  it('keeps the local original and stops automatic merging on a divergent event', () => {
    const server = write(start(), '8')
    const local = write(start(), '9')
    expect(recoverDiagnosticDraft(server, local)).toEqual({ snapshot: local, conflict: true })
  })

  it('refuses a different attempt or a corrupt local final image', () => {
    const server = start()
    expect(() => recoverDiagnosticDraft(server, { ...start(), attemptId: 'other' })).toThrow()
    expect(() => recoverDiagnosticDraft(server, { ...start(), cells: { '0:0': { main: '8', note: '' } } })).toThrow()
  })
})
