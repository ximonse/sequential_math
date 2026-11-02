import { replayDiagnosticGrid } from './diagnosticGridModel.js'
import { shortDivisionTemplateFor } from './shortDivisionTemplate.js'

// Observable content only. A nonempty grid is not proof that a result exists.
export function diagnosticNotebookStatus(snapshot, task = {}) {
  const grid = replayDiagnosticGrid(snapshot)
  const occupied = Object.values(grid.cells).filter(cell => cell.main || cell.note).length
  const answerEmpty = grid.answerType === 'choice' ? !grid.selectedOptionIds.length : !grid.answer.trim()
  const gridHasContent = task.gridEnabled !== false && (occupied > 0 || grid.lines.length > 0)
  return { answerEmpty, gridHasContent, drawingHasStrokes: grid.drawing.length > 0,
    workWithoutAnswer: answerEmpty && (gridHasContent || grid.drawing.length > 0),
    occupiedCells: occupied, resultInterpretation: 'not_inferred' }
}

export function diagnosticNotebookExport(snapshot, task = {}) {
  const grid = replayDiagnosticGrid(snapshot)
  const points = Object.entries(grid.cells).filter(([, cell]) => cell.main || cell.note)
    .map(([key]) => { const [row, column] = key.split(':').map(Number); return { row, column } })
  for (const line of grid.lines) points.push(line.from, line.to)
  const template = shortDivisionTemplateFor(task, grid), lineNotes = grid.lineNotes || {}
  if (template) points.push({ row: template.row, column: template.first }, { row: template.row + 1, column: template.lastColumn })
  for (const key of Object.keys(lineNotes)) { const [row, column] = key.split(':').map(Number); points.push({ row, column }) }
  const bounds = points.length ? { firstRow: Math.min(...points.map(p => p.row)), lastRow: Math.max(...points.map(p => p.row)),
    firstColumn: Math.min(...points.map(p => p.column)), lastColumn: Math.max(...points.map(p => p.column)) }
    : { firstRow: 0, lastRow: 0, firstColumn: 0, lastColumn: 0 }
  const rows = bounds.lastRow - bounds.firstRow + 1, columns = bounds.lastColumn - bounds.firstColumn + 1
  const textRows = []
  for (let row = bounds.firstRow; row <= bounds.lastRow; row++) {
    const cells = []
    for (let column = bounds.firstColumn; column <= bounds.lastColumn; column++) {
      const cell = grid.cells[`${row}:${column}`] || {}
      cells.push(`${cell.main || '·'}${cell.note ? `{note:${cell.note}}` : ''}${cell.struck ? '{struck}' : ''}`)
    }
    textRows.push(`r${row + 1}: ${cells.join(' | ')}`)
  }
  const lines = grid.lines.map(line => `${line.axis} r${line.from.row + 1}c${line.from.column + 1}–r${line.to.row + 1}c${line.to.column + 1} (${line.placement || 'legacy-inset'})`)
  if (template) lines.push(`Printed by the app, not written by the pupil: ${template.digits.join('')} over a fraction bar, ${template.divisor} below, "=" and an answer line (r${template.row + 1}–r${template.row + 2}, c${template.first + 1}–c${template.lastColumn + 1}). The answer line shows the final answer.`)
  for (const [key, value] of Object.entries(lineNotes)) {
    const [row, column] = key.split(':').map(Number)
    lines.push(`small digit ${value} on the line between c${column} and c${column + 1}, r${row + 1}`)
  }
  return { schemaVersion: 1, status: diagnosticNotebookStatus(snapshot, task),
    gridEnabled: task.gridEnabled !== false, bounds, rows, columns, cellAspectRatio: 1.6,
    text: [`Columns ${bounds.firstColumn + 1}–${bounds.lastColumn + 1}. · = empty; {note} = small digit; {struck} = crossed out.`,
      ...textRows, ...lines, `Drawing: ${grid.drawing.length} saved strokes; not transcribed.`].join('\n'),
    // Final saved state, never fabricated intermediate steps or the answer key.
    workspace: { rows: grid.rows, columns: grid.columns, cells: grid.cells, lines: grid.lines, drawing: grid.drawing,
      ...(template ? { template, answer: grid.answer } : {}), ...(Object.keys(lineNotes).length ? { lineNotes } : {}) } }
}
