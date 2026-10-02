import { describe, expect, it } from 'vitest'
import manifest from './diagnosticTasks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { analyzeDiagnosticSubtractionPattern } from './diagnosticSubtractionPattern.js'

const task = manifest.tasks.find(item => item.analysisCaseId === 'S2')
const setup = [
  { 5: '4', 6: '0', 7: '2' },
  { 4: '−', 5: '1', 6: '7', 7: '8' },
  { 4: '─', 5: '─', 6: '─', 7: '─' }
]

function work(rows, answer) {
  let grid = createDiagnosticGrid({ attemptId: 'A', taskId: task.taskId, taskVersion: task.taskVersion })
  for (const [row, cells] of rows.entries()) {
    for (const [column, after] of Object.entries(cells)) {
      grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row, column: Number(column) },
        layer: 'main', before: '', after }, grid.events.length + 1)
    }
  }
  return recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: answer }, grid.events.length + 1)
}

describe('task-specific subtraction pattern', () => {
  it('marks a fully visible 376 only as a hypothesis to check with the pupil', () => {
    const grid = work([...setup, { 5: '3', 6: '7', 7: '6' }], '376')
    const result = analyzeDiagnosticSubtractionPattern(task, grid)
    expect(result).toMatchObject({ analysisVersion: 1, status: 'matched',
      hypothesisCode: 'larger_digit_minus_smaller_per_column',
      limitation: 'pattern_not_proof_of_method',
      evidence: { resultCells: [{ row: 3, column: 5 }, { row: 3, column: 6 }, { row: 3, column: 7 }] } })
    expect(analyzeDiagnosticSubtractionPattern(task, JSON.parse(JSON.stringify(grid)))).toEqual(result)
  })

  it('distinguishes a visible counterexample from too little or conflicting evidence', () => {
    expect(analyzeDiagnosticSubtractionPattern(task, work([...setup, { 5: '2', 6: '2', 7: '4' }], '224')))
      .toMatchObject({ status: 'no_match' })
    expect(analyzeDiagnosticSubtractionPattern(task, work([], '376')))
      .toMatchObject({ status: 'insufficient_evidence' })
    expect(analyzeDiagnosticSubtractionPattern(task, work([...setup, { 5: '3', 6: '7', 7: '6' }], '224')))
      .toMatchObject({ status: 'insufficient_evidence' })
    let marked = work([...setup, { 5: '3', 6: '7', 7: '6' }], '376')
    marked = recordDiagnosticGridEvent(marked, { type: 'write', position: { row: 0, column: 4 },
      layer: 'note', before: '', after: '1' }, marked.events.length + 1)
    expect(analyzeDiagnosticSubtractionPattern(task, marked)).toMatchObject({ status: 'insufficient_evidence' })
  })

  it('does not apply the subtraction hypothesis to other tasks', () => {
    const other = manifest.tasks[0]
    const grid = createDiagnosticGrid({ attemptId: 'B', taskId: other.taskId, taskVersion: other.taskVersion })
    expect(analyzeDiagnosticSubtractionPattern(other, grid)).toMatchObject({ status: 'not_applicable' })
  })
})
