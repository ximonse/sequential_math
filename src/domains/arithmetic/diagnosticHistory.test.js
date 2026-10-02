import { describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { describeDiagnosticEvent, diagnosticHistoryFrame } from './diagnosticHistory.js'

it('reconstructs each saved step, including a correction, carry note and crossed-out digit', () => {
  let grid = createDiagnosticGrid({ attemptId: 'A', taskId: 'T', taskVersion: 1 })
  grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row: 0, column: 0 }, layer: 'main', before: '', after: '8' }, 1001)
  grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row: 0, column: 0 }, layer: 'main', before: '8', after: '6' }, 1002)
  grid = recordDiagnosticGridEvent(grid, { type: 'cross_out', position: { row: 0, column: 0 }, before: false, after: true }, 1003)
  grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row: 0, column: 1 }, layer: 'note', before: '', after: '1' }, 1004)
  grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: '15' }, 1005)
  grid = recordDiagnosticGridEvent(grid, { type: 'pause' }, 1006)

  expect(diagnosticHistoryFrame(grid, 0).cells).toEqual({})
  expect(diagnosticHistoryFrame(grid, 1).cells['0:0'].main).toBe('8')
  expect(diagnosticHistoryFrame(grid, 2).cells['0:0'].main).toBe('6')
  expect(diagnosticHistoryFrame(grid, 3).cells['0:0'].struck).toBe(true)
  expect(diagnosticHistoryFrame(grid, 4).cells['0:1'].note).toBe('1')
  expect(diagnosticHistoryFrame(grid, 4).answer).toBe('')
  expect(diagnosticHistoryFrame(grid, 5).answer).toBe('15')
  expect(diagnosticHistoryFrame(grid, 6)).toEqual(grid)
  expect(describeDiagnosticEvent(grid.events[1])).toContain('från 8 till 6')
  expect(describeDiagnosticEvent(grid.events[5])).toBe('Pausade arbetet.')
})

describe('history integrity', () => {
  it('rejects an out-of-range step and a final image that disagrees with the event stream', () => {
    const grid = recordDiagnosticGridEvent(
      createDiagnosticGrid({ attemptId: 'A', taskId: 'T', taskVersion: 1 }),
      { type: 'write', position: { row: 0, column: 0 }, layer: 'main', before: '', after: '8' }, 1001)
    expect(() => diagnosticHistoryFrame(grid, 2)).toThrow('step')
    expect(() => diagnosticHistoryFrame({ ...grid, cells: {} }, 0)).toThrow('snapshot')
  })
})
