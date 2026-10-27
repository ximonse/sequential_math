import { choiceObservation, isChoiceTask } from './screeningImageQuestions.js'
import { replayDiagnosticGrid } from './diagnosticGridModel.js'
import { checkNcmAnswer } from './ncmAnswerCheck.js'

export const DIAGNOSTIC_OBSERVATION_VERSION = 1

function expectedAnswer(task) {
  if (!Array.isArray(task?.operands) || task.operands.length !== 2
    || !task.operands.every(Number.isSafeInteger)) throw new Error('Invalid diagnostic operands')
  if (task.operation === 'addition' && task.answerRule === 'integer_addition') {
    return task.operands[0] + task.operands[1]
  }
  if (task.operation === 'subtraction' && task.answerRule === 'integer_subtraction') {
    return task.operands[0] - task.operands[1]
  }
  throw new Error('Unsupported diagnostic answer rule')
}

function observableFacts(task, grid) {
  const lastAnswerEvent = [...grid.events].reverse().find(event => ['answer_change', 'selection_change'].includes(event.type))
  return {
    observationVersion: DIAGNOSTIC_OBSERVATION_VERSION,
    attemptId: grid.attemptId,
    taskId: task.taskId,
    taskVersion: task.taskVersion,
    gridVersion: grid.version,
    submitted: grid.status === 'submitted',
    answerEventId: lastAnswerEvent?.eventId || null,
    finalOccupiedCells: Object.values(grid.cells).filter(cell => cell.main || cell.note).length,
    hasWorkHistory: grid.events.some(event => ['write', 'erase', 'reclassify', 'cross_out', 'line_add', 'drawing_stroke'].includes(event.type))
  }
}

// NCM tasks are marked against the diagnosis facit; expectedAnswer is its text.
function ncmObservation(task, grid) {
  const answer = grid.answer.trim()
  return { ...observableFacts(task, grid), explicitAnswer: answer || null,
    expectedAnswer: task.facitSv, answerStatus: checkNcmAnswer(task, answer) }
}

// Records directly observable facts. Method hypotheses belong to a separate,
// versioned analysis and must never be inferred from the final answer alone.
export function summarizeDiagnosticObservation(task, snapshot) {
  if (task?.taskId !== snapshot?.taskId || task?.taskVersion !== snapshot?.taskVersion) {
    throw new Error('Diagnostic task and grid version do not match')
  }
  const grid = replayDiagnosticGrid(snapshot)
  if (isChoiceTask(task)) return { ...observableFacts(task, grid), ...choiceObservation(task, grid) }
  if (task.answerRule === 'ncm_facit') return ncmObservation(task, grid)
  const manual = task.answerType === 'text' || task.answerRule === 'teacher_review'
  const expected = manual ? null : expectedAnswer(task)
  if (!manual && !Number.isSafeInteger(expected)) throw new Error('Diagnostic answer is outside the safe integer range')
  const answer = grid.answer.trim()
  const completeAnswer = /^[−-]?\d+$/u.test(answer)
  const lastAnswerEvent = [...grid.events].reverse().find(event => ['answer_change', 'selection_change'].includes(event.type))
  const finalCells = Object.values(grid.cells).filter(cell => cell.main || cell.note)
  return {
    observationVersion: DIAGNOSTIC_OBSERVATION_VERSION,
    attemptId: grid.attemptId,
    taskId: task.taskId,
    taskVersion: task.taskVersion,
    gridVersion: grid.version,
    submitted: grid.status === 'submitted',
    explicitAnswer: answer || null,
    expectedAnswer: expected,
    answerStatus: !answer ? 'unanswered' : manual ? 'unassessed' : !completeAnswer ? 'incomplete'
      : Number(answer.replace('−', '-')) === expected ? 'correct' : 'incorrect',
    answerEventId: lastAnswerEvent?.eventId || null,
    finalOccupiedCells: finalCells.length,
    hasWorkHistory: grid.events.some(event => ['write', 'erase', 'reclassify', 'cross_out', 'line_add', 'drawing_stroke'].includes(event.type))
  }
}
