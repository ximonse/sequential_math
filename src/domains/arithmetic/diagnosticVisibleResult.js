import { replayDiagnosticGrid } from './diagnosticGridModel.js'
import { analyzeDiagnosticColumnAlignment } from './diagnosticColumnAlignment.js'

export const VISIBLE_RESULT_ANALYSIS_VERSION = 1

// Only a conventional, four-row calculation with an explicit answer line is
// interpreted. Other valid ways of calculating remain unknown to this rule.
export function analyzeDiagnosticVisibleResult(task, snapshot) {
  const alignment = analyzeDiagnosticColumnAlignment(task, snapshot)
  const grid = replayDiagnosticGrid(snapshot)
  const base = { analysisVersion: VISIBLE_RESULT_ANALYSIS_VERSION,
    attemptId: grid.attemptId, taskId: task.taskId, taskVersion: task.taskVersion }
  const unknown = reason => ({ ...base, status: 'unknown', reason })
  if (alignment.status !== 'observed' || alignment.alignment !== 'aligned') {
    return unknown('no_unique_aligned_setup')
  }
  if (!/^[−-]?\d+$/u.test(grid.answer)) return unknown('no_complete_explicit_answer')
  const { upper, lower } = alignment.evidence
  const lineRow = lower.row + 1
  const resultRow = lower.row + 2
  if (resultRow >= grid.rows) return unknown('no_result_row')

  const mainCells = Object.entries(grid.cells).flatMap(([key, cell]) => {
    if (!cell.main) return []
    const [row, column] = key.split(':').map(Number)
    return [{ row, column, value: cell.main, struck: Boolean(cell.struck) }]
  })
  const line = mainCells.filter(cell => cell.row === lineRow).sort((a, b) => a.column - b.column)
  const result = mainCells.filter(cell => cell.row === resultRow).sort((a, b) => a.column - b.column)
  const firstOperandColumn = Math.min(upper.firstColumn, lower.firstColumn)
  if (mainCells.some(cell => (cell.row === upper.row || cell.row === lower.row) && cell.struck)) {
    return unknown('crossed_out_operand')
  }
  if (line.length < lower.digitCells.length
    || line.some(cell => cell.value !== '─' || cell.struck)
    || line[0]?.column > firstOperandColumn || line.at(-1)?.column !== lower.lastColumn
    || line.some((cell, index) => index > 0 && cell.column !== line[index - 1].column + 1)) {
    return unknown('no_unambiguous_answer_line')
  }
  if (!result.length || result.some(cell => !/^[0-9]$/u.test(cell.value) || cell.struck)
    || result.at(-1).column !== lower.lastColumn
    || result.some((cell, index) => index > 0 && cell.column !== result[index - 1].column + 1)) {
    return unknown('no_unambiguous_result')
  }
  const setupRows = new Set([upper.row, lower.row, lineRow, resultRow])
  if (mainCells.some(cell => !setupRows.has(cell.row))) {
    return unknown('other_visible_work')
  }
  const visibleResult = Number(result.map(cell => cell.value).join(''))
  const explicitAnswer = Number(grid.answer.replace('−', '-'))
  if (!Number.isSafeInteger(visibleResult) || !Number.isSafeInteger(explicitAnswer)) {
    return unknown('result_outside_safe_range')
  }
  return { ...base, status: 'observed', consistency: visibleResult === explicitAnswer ? 'same' : 'different',
    visibleResult, explicitAnswer,
    evidence: { answerLine: line.map(({ row, column }) => ({ row, column })),
      resultCells: result.map(({ row, column }) => ({ row, column })) } }
}
