import { describe, expect, it } from 'vitest'
import manifest from './diagnosticTasks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { analyzeDiagnosticVisibleResult } from './diagnosticVisibleResult.js'

const task = manifest.tasks[0]

function gridWith(rows, answer = '699') {
  let grid = createDiagnosticGrid({ attemptId: 'A', taskId: task.taskId, taskVersion: task.taskVersion })
  for (const [row, cells] of rows.entries()) {
    for (const [column, after] of Object.entries(cells)) {
      grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row, column: Number(column) },
        layer: 'main', before: '', after }, grid.events.length + 1)
    }
  }
  if (answer) grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: answer }, grid.events.length + 1)
  return grid
}

const rows = [
  { 5: '2', 6: '6', 7: '8' },
  { 4: '+', 5: '4', 6: '3', 7: '1' },
  { 4: '─', 5: '─', 6: '─', 7: '─' },
  { 5: '6', 6: '9', 7: '9' }
]

describe('visible result and explicit answer comparison', () => {
  it('reports matching or differing written results with exact evidence cells', () => {
    const same = analyzeDiagnosticVisibleResult(task, gridWith(rows))
    expect(same).toMatchObject({ analysisVersion: 1, status: 'observed', consistency: 'same',
      visibleResult: 699, explicitAnswer: 699,
      evidence: { resultCells: [{ row: 3, column: 5 }, { row: 3, column: 6 }, { row: 3, column: 7 }] } })
    const different = analyzeDiagnosticVisibleResult(task, gridWith(rows, '698'))
    expect(different).toMatchObject({ status: 'observed', consistency: 'different',
      visibleResult: 699, explicitAnswer: 698 })
    expect(analyzeDiagnosticVisibleResult(task, JSON.parse(JSON.stringify(gridWith(rows))))).toEqual(same)
  })

  it('returns unknown rather than interpreting absent, crossed-out or ambiguous work', () => {
    expect(analyzeDiagnosticVisibleResult(task, gridWith(rows.slice(0, 2).concat([{}, rows[3]])))).toMatchObject({ status: 'unknown' })
    expect(analyzeDiagnosticVisibleResult(task, gridWith(rows, ''))).toMatchObject({ status: 'unknown' })
    expect(analyzeDiagnosticVisibleResult(task, gridWith([...rows, { 8: '7' }]))).toMatchObject({ status: 'unknown' })
    const marked = recordDiagnosticGridEvent(gridWith(rows), { type: 'cross_out',
      position: { row: 3, column: 7 }, before: false, after: true }, 9999)
    expect(analyzeDiagnosticVisibleResult(task, marked)).toMatchObject({ status: 'unknown' })
    const duplicate = gridWith([...rows, { 5: '2', 6: '6', 7: '8' }])
    expect(analyzeDiagnosticVisibleResult(task, duplicate)).toMatchObject({ status: 'unknown' })
  })
})
