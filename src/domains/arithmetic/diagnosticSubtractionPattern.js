import { replayDiagnosticGrid } from './diagnosticGridModel.js'
import { analyzeDiagnosticColumnAlignment } from './diagnosticColumnAlignment.js'
import { analyzeDiagnosticVisibleResult } from './diagnosticVisibleResult.js'

export const SUBTRACTION_PATTERN_ANALYSIS_VERSION = 1

// A task-specific pattern for the first subtraction-through-zero case. A match
// only motivates a teacher question; it cannot establish the pupil's method.
export function analyzeDiagnosticSubtractionPattern(task, snapshot) {
  const grid = replayDiagnosticGrid(snapshot)
  if (task?.taskId !== grid.taskId || task?.taskVersion !== grid.taskVersion) {
    throw new Error('Diagnostic task and grid version do not match')
  }
  const base = { analysisVersion: SUBTRACTION_PATTERN_ANALYSIS_VERSION,
    attemptId: grid.attemptId, taskId: task.taskId, taskVersion: task.taskVersion }
  if (task.analysisCaseId !== 'S2' || task.operation !== 'subtraction'
    || JSON.stringify(task.operands) !== '[402,178]') return { ...base, status: 'not_applicable' }

  const visible = analyzeDiagnosticVisibleResult(task, snapshot)
  const alignment = analyzeDiagnosticColumnAlignment(task, snapshot)
  if (visible.status !== 'observed' || visible.consistency !== 'same'
    || Object.values(grid.cells).some(cell => cell.note || cell.struck)) {
    return { ...base, status: 'insufficient_evidence' }
  }
  const perColumnDifference = task.operands[0].toString().split('')
    .map((digit, index) => Math.abs(Number(digit) - Number(String(task.operands[1])[index])))
    .join('')
  if (String(visible.visibleResult) !== perColumnDifference) {
    return { ...base, status: 'no_match' }
  }
  return { ...base, status: 'matched', hypothesisCode: 'larger_digit_minus_smaller_per_column',
    evidence: { operands: [alignment.evidence.upper.digitCells, alignment.evidence.lower.digitCells],
      resultCells: visible.evidence.resultCells, answerEventId: grid.events.findLast(event => event.type === 'answer_change')?.eventId || null },
    limitation: 'pattern_not_proof_of_method' }
}
