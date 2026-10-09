import { it, expect } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent, replayDiagnosticGrid } from './diagnosticGridModel'

it('preserves percent and algebra characters and decimal answers through replay', () => {
  let grid = createDiagnosticGrid({ attemptId: 'symbols', taskId: 'add-carry-001', taskVersion: 1 })
  for (const [column, after] of ['x', 'y', 'a', 'b', '=', '²', '%', '(', ')', 'n', 'c', '÷'].entries()) {
    grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row: 0, column }, layer: 'main', before: '', after }, column + 1)
  }
  grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: '−12,5' }, 13)
  expect(replayDiagnosticGrid(JSON.parse(JSON.stringify(grid)))).toEqual(grid)
  expect(() => recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '−12,5', after: '1,2,3' }, 14)).toThrow()
  expect(() => recordDiagnosticGridEvent(grid, { type: 'write', position: { row: 1, column: 0 }, layer: 'note', before: '', after: '%' }, 14)).toThrow()
})
