import { replayDiagnosticGrid } from './diagnosticGridModel.js'

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

// Records directly observable facts. Method hypotheses belong to a separate,
// versioned analysis and must never be inferred from the final answer alone.
export function summarizeDiagnosticObservation(task, snapshot) {
  if (task?.taskId !== snapshot?.taskId || task?.taskVersion !== snapshot?.taskVersion) {
    throw new Error('Diagnostic task and grid version do not match')
  }
  const grid = replayDiagnosticGrid(snapshot)
  const expected = expectedAnswer(task)
  if (!Number.isSafeInteger(expected)) throw new Error('Diagnostic answer is outside the safe integer range')
  const answer = grid.answer.trim()
  const completeAnswer = /^[−-]?\d+$/u.test(answer)
  const lastAnswerEvent = [...grid.events].reverse().find(event => event.type === 'answer_change')
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
    answerStatus: !answer ? 'unanswered' : !completeAnswer ? 'incomplete'
      : Number(answer.replace('−', '-')) === expected ? 'correct' : 'incorrect',
    answerEventId: lastAnswerEvent?.eventId || null,
    finalOccupiedCells: finalCells.length,
    hasWorkHistory: grid.events.some(event => ['write', 'erase', 'reclassify', 'cross_out'].includes(event.type))
  }
}
