import { describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent as record } from './diagnosticGridModel.js'
import { diagnosticNotebookExport, diagnosticNotebookStatus } from './diagnosticNotebookExport.js'

const initial = () => createDiagnosticGrid({ attemptId: 'A', taskId: 'T', taskVersion: 1 })
const write = (grid, row, column, value, layer = 'main') => record(grid, { type: 'write', position: { row, column }, layer,
  before: grid.cells[`${row}:${column}`]?.[layer] || '', after: value }, 1000)
describe('saved notebook export', () => {
  it('does not mistake empty answers or a single digit for a completed calculation', () => {
    const empty = initial(), worked = write(empty, 2, 3, '4')
    expect(diagnosticNotebookStatus(empty)).toMatchObject({ answerEmpty: true, gridHasContent: false, workWithoutAnswer: false })
    expect(diagnosticNotebookStatus(worked)).toMatchObject({ answerEmpty: true, gridHasContent: true,
      workWithoutAnswer: true, resultInterpretation: 'not_inferred' })
    expect(diagnosticNotebookStatus(record(worked, { type: 'answer_change', before: '', after: '4' }, 1001)).workWithoutAnswer).toBe(false)
  })
  it('preserves notes, struck digits and both line geometries without changing the original', () => {
    let grid = write(initial(), 2, 3, '4')
    grid = write(grid, 2, 3, '12', 'note')
    grid = record(grid, { type: 'cross_out', position: { row: 2, column: 3 }, before: false, after: true }, 1001)
    grid = record(grid, { type: 'line_add', axis: 'horizontal', placement: 'grid-border', from: { row: 3, column: 1 }, to: { row: 3, column: 5 } }, 1002)
    grid = record(grid, { type: 'line_add', axis: 'vertical', from: { row: 0, column: 6 }, to: { row: 4, column: 6 } }, 1003)
    const original = JSON.stringify(grid), result = diagnosticNotebookExport(grid)
    expect(result.bounds).toEqual({ firstRow: 0, lastRow: 4, firstColumn: 1, lastColumn: 6 })
    expect(result.rows).toBe(5); expect(result.columns).toBe(6)
    expect(result.text).toContain('4{note:12}{struck}')
    expect(result.text).toContain('grid-border'); expect(result.text).toContain('legacy-inset')
    expect(result.workspace).not.toHaveProperty('events')
    expect(JSON.stringify(grid)).toBe(original)
  })
  it('counts drawing as saved work but never transcribes or interprets it', () => {
    const grid = record(initial(), { type: 'drawing_stroke', points: [[0.2, 0.3]], erasing: false }, 1001)
    expect(diagnosticNotebookExport(grid).status).toMatchObject({ drawingHasStrokes: true, gridHasContent: false, workWithoutAnswer: true })
    expect(diagnosticNotebookExport(grid).text).toContain('not transcribed')
    expect(() => diagnosticNotebookExport({ ...grid, answer: 'fabricated' })).toThrow(/snapshot/u)
  })
  it('respects disabled grids and choice answers', () => {
    const grid = createDiagnosticGrid({ attemptId: 'B', taskId: 'C', taskVersion: 1,
      answerType: 'choice', choiceConfig: { optionIds: ['a', 'b'], multiple: true } })
    const selected = record(grid, { type: 'selection_change', before: [], after: ['b'] }, 1001)
    expect(diagnosticNotebookStatus(selected, { gridEnabled: false }).answerEmpty).toBe(false)
    expect(diagnosticNotebookExport(selected, { gridEnabled: false }).gridEnabled).toBe(false)
  })
})
