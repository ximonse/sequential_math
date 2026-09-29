import { describe, expect, it } from 'vitest'
import {
  createDiagnosticGrid,
  recordDiagnosticGridEvent,
  replayDiagnosticGrid
} from './diagnosticGridModel'

function startingGrid() {
  return createDiagnosticGrid({ attemptId: 'attempt-1', taskId: 'add-carry-001', taskVersion: 1 })
}

describe('diagnostic grid observation', () => {
  it('replays insertion, correction, note, movement and interruption without losing the final image', () => {
    let grid = startingGrid()
    grid = recordDiagnosticGridEvent(grid, {
      type: 'write', position: { row: 0, column: 0 }, layer: 'main', before: '', after: '8'
    }, 1001)
    grid = recordDiagnosticGridEvent(grid, {
      type: 'move', from: { row: 0, column: 0 }, to: { row: 0, column: 1 }
    }, 1002)
    grid = recordDiagnosticGridEvent(grid, {
      type: 'write', position: { row: 0, column: 1 }, layer: 'main', before: '', after: '7'
    }, 1003)
    grid = recordDiagnosticGridEvent(grid, {
      type: 'write', position: { row: 0, column: 1 }, layer: 'main', before: '7', after: '4'
    }, 1004)
    grid = recordDiagnosticGridEvent(grid, { type: 'layer', from: 'main', to: 'note' }, 1005)
    grid = recordDiagnosticGridEvent(grid, {
      type: 'write', position: { row: 0, column: 1 }, layer: 'note', before: '', after: '1'
    }, 1006)
    grid = recordDiagnosticGridEvent(grid, { type: 'focus_lost' }, 1007)
    grid = recordDiagnosticGridEvent(grid, { type: 'pause' }, 1008)
    grid = recordDiagnosticGridEvent(grid, { type: 'resume' }, 1009)
    grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: '575' }, 1010)
    grid = recordDiagnosticGridEvent(grid, { type: 'submit' }, 1011)

    const restored = replayDiagnosticGrid(JSON.parse(JSON.stringify(grid)))
    expect(restored).toEqual(grid)
    expect(restored.cells['0:1']).toEqual({ main: '4', note: '1' })
    expect(restored.events.map(event => event.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(restored.answer).toBe('575')
    expect(restored.status).toBe('submitted')
  })

  it('rejects a changed snapshot, reordered event or edit after submission', () => {
    const inserted = recordDiagnosticGridEvent(startingGrid(), {
      type: 'write', position: { row: 0, column: 0 }, layer: 'main', before: '', after: '8'
    }, 1001)
    expect(() => replayDiagnosticGrid({ ...inserted, cells: {} })).toThrow('snapshot')
    expect(() => replayDiagnosticGrid({ ...inserted, events: [{ ...inserted.events[0], sequence: 2 }] }))
      .toThrow('order')
    const submitted = recordDiagnosticGridEvent(inserted, { type: 'submit' }, 1002)
    expect(() => recordDiagnosticGridEvent(submitted, { type: 'erase', position: { row: 0, column: 0 }, layer: 'main', before: '8' }, 1003))
      .toThrow('immutable')
  })

  it('keeps separate attempts and task versions distinct', () => {
    const first = startingGrid()
    const repeat = createDiagnosticGrid({ attemptId: 'attempt-2', taskId: first.taskId, taskVersion: 1 })
    expect(repeat.attemptId).not.toBe(first.attemptId)
    expect(first.events).toEqual([])
    expect(repeat.events).toEqual([])
    expect(() => replayDiagnosticGrid({ ...first, version: 2 })).toThrow('version')
  })
})
