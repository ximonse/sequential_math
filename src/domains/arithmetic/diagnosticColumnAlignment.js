import { replayDiagnosticGrid } from './diagnosticGridModel.js'

export const COLUMN_ALIGNMENT_ANALYSIS_VERSION = 1

const digit = value => /^[0-9]$/u.test(value || '')

function rowEntries(grid, row) {
  return Object.entries(grid.cells).map(([key, cell]) => {
    const [cellRow, column] = key.split(':').map(Number)
    return { row: cellRow, column, value: cell.main }
  }).filter(cell => cell.row === row && cell.value).sort((a, b) => a.column - b.column)
}

function operandCandidate(grid, row, operand, operator) {
  const entries = rowEntries(grid, row)
  const digits = entries.filter(cell => digit(cell.value))
  const text = String(operand)
  if (digits.length !== text.length || digits.map(cell => cell.value).join('') !== text
    || digits.some((cell, index) => index > 0 && cell.column !== digits[index - 1].column + 1)) return null
  const symbols = entries.filter(cell => !digit(cell.value))
  if (operator === null && symbols.length) return null
  if (operator !== null && (symbols.length !== 1 || symbols[0].value !== operator
    || symbols[0].column !== digits[0].column - 1)) return null
  return { row, firstColumn: digits[0].column, lastColumn: digits.at(-1).column,
    digitCells: digits.map(cell => ({ row, column: cell.column })),
    operatorCell: symbols.length ? { row, column: symbols[0].column } : null }
}

// Recognizes only a unique, conventional two-row setup. Unknown is mandatory
// for scratch work, alternate layouts, or ambiguous copies of the operands.
export function analyzeDiagnosticColumnAlignment(task, snapshot) {
  if (task?.taskId !== snapshot?.taskId || task?.taskVersion !== snapshot?.taskVersion) {
    throw new Error('Diagnostic task and grid version do not match')
  }
  const grid = replayDiagnosticGrid(snapshot)
  if (!['addition', 'subtraction'].includes(task.operation)
    || !Array.isArray(task.operands) || task.operands.length !== 2
    || !task.operands.every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('Unsupported diagnostic column task')
  }
  const symbol = task.operation === 'addition' ? '+' : '−'
  const uppers = []
  const lowers = []
  for (let row = 0; row < grid.rows; row++) {
    const upper = operandCandidate(grid, row, task.operands[0], null)
    const lower = operandCandidate(grid, row, task.operands[1], symbol)
    if (upper) uppers.push(upper)
    if (lower) lowers.push(lower)
  }
  const base = { analysisVersion: COLUMN_ALIGNMENT_ANALYSIS_VERSION,
    attemptId: grid.attemptId, taskId: task.taskId, taskVersion: task.taskVersion }
  if (uppers.length !== 1 || lowers.length !== 1 || lowers[0].row !== uppers[0].row + 1) {
    return { ...base, status: 'unknown', reason: 'no_unique_two_row_setup' }
  }
  const [upper] = uppers
  const [lower] = lowers
  return { ...base, status: 'observed',
    alignment: upper.lastColumn === lower.lastColumn ? 'aligned' : 'misaligned',
    evidence: { upper, lower } }
}
