import { describe, expect, it } from 'vitest'
import manifest from './diagnosticTasks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { analyzeDiagnosticColumnAlignment } from './diagnosticColumnAlignment.js'

function work(task, rows) {
  let grid = createDiagnosticGrid({ attemptId: 'ATTEMPT', taskId: task.taskId,
    taskVersion: task.taskVersion })
  for (const [row, columns] of rows.entries()) {
    for (const [column, value] of Object.entries(columns)) {
      grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row, column: Number(column) },
        layer: 'main', before: '', after: value }, grid.events.length + 1)
    }
  }
  return grid
}

describe('conservative column alignment recognition', () => {
  it('observes aligned addition operands even when a carry note is present', () => {
    const task = manifest.tasks[0]
    let grid = work(task, [{ 5: '2', 6: '6', 7: '8' }, { 4: '+', 5: '4', 6: '3', 7: '1' }])
    grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row: 0, column: 8 },
      layer: 'note', before: '', after: '1' }, grid.events.length + 1)
    expect(analyzeDiagnosticColumnAlignment(task, grid)).toMatchObject({
      status: 'observed', alignment: 'aligned',
      evidence: { upper: { lastColumn: 7 }, lower: { lastColumn: 7 } }
    })
  })

  it('observes shifted subtraction operands without calling it a knowledge error', () => {
    const task = manifest.tasks[2]
    const grid = work(task, [{ 5: '7', 6: '6', 7: '4' },
      { 5: '−', 6: '2', 7: '3', 8: '1' }])
    expect(analyzeDiagnosticColumnAlignment(task, grid)).toMatchObject({
      status: 'observed', alignment: 'misaligned',
      evidence: { upper: { lastColumn: 7 }, lower: { lastColumn: 8 } }
    })
  })

  it('returns unknown for unlabelled rows and scratch work', () => {
    const task = manifest.tasks[0]
    const noOperator = work(task, [{ 5: '2', 6: '6', 7: '8' }, { 5: '4', 6: '3', 7: '1' }])
    expect(analyzeDiagnosticColumnAlignment(task, noOperator)).toMatchObject({ status: 'unknown' })
    const scratch = work(task, [{ 5: '2', 6: '6', 7: '8' },
      { 4: '+', 5: '4', 6: '3', 7: '1', 9: '8' }])
    expect(analyzeDiagnosticColumnAlignment(task, scratch)).toMatchObject({ status: 'unknown' })
    const duplicate = work(task, [{ 5: '2', 6: '6', 7: '8' },
      { 4: '+', 5: '4', 6: '3', 7: '1' }, {}, { 5: '2', 6: '6', 7: '8' }])
    expect(analyzeDiagnosticColumnAlignment(task, duplicate)).toMatchObject({ status: 'unknown' })
  })

  it('rejects a task mismatch and tampered observations', () => {
    const task = manifest.tasks[0]
    const grid = work(task, [{ 5: '2', 6: '6', 7: '8' }, { 4: '+', 5: '4', 6: '3', 7: '1' }])
    expect(() => analyzeDiagnosticColumnAlignment({ ...task, taskVersion: 2 }, grid)).toThrow()
    expect(() => analyzeDiagnosticColumnAlignment(task, { ...grid, cells: {} })).toThrow()
  })
})
