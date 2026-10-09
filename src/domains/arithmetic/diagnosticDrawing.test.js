import { describe, it, expect } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent, replayDiagnosticGrid } from './diagnosticGridModel.js'
import { prepareDiagnosticAppend } from './diagnosticAttemptAppend.js'
import { diagnosticHistoryFrame, describeDiagnosticEvent } from './diagnosticHistory.js'

describe('drawing colors and explicit clearing', () => {
  it('preserves legacy ink and magenta through append, replay and history before clearing', () => {
    const initial = createDiagnosticGrid({ attemptId: 'draw', taskId: 'task', taskVersion: 1 })
    let grid = recordDiagnosticGridEvent(initial, { type: 'drawing_stroke', points: [[0.1, 0.2]], erasing: false })
    grid = recordDiagnosticGridEvent(grid, { type: 'drawing_stroke', points: [[0.3, 0.4]], erasing: false, color: 'magenta' })
    grid = recordDiagnosticGridEvent(grid, { type: 'drawing_clear' })
    const saved = prepareDiagnosticAppend({ snapshot: initial, serverRevision: 0, expectedRevision: 0, events: grid.events }).snapshot
    expect(replayDiagnosticGrid(JSON.parse(JSON.stringify(saved)))).toEqual(grid)
    expect(saved.drawing).toEqual([])
    expect(diagnosticHistoryFrame(saved, 2).drawing).toEqual([
      { points: [[0.1, 0.2]], erasing: false },
      { points: [[0.3, 0.4]], erasing: false, color: 'magenta' }
    ])
    expect(describeDiagnosticEvent(saved.events.at(-1))).toBe('Rensade ritytan.')
    expect(initial.events).toEqual([])
  })
  it('rejects arbitrary ink colors and edits to submitted drawings', () => {
    const initial = createDiagnosticGrid({ attemptId: 'draw', taskId: 'task', taskVersion: 1 })
    expect(() => recordDiagnosticGridEvent(initial, { type: 'drawing_stroke', points: [[0.1, 0.2]], erasing: false, color: 'red' })).toThrow()
    const submitted = recordDiagnosticGridEvent(initial, { type: 'submit' })
    expect(() => recordDiagnosticGridEvent(submitted, { type: 'drawing_clear' })).toThrow()
  })
})
