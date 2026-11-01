import { describe, expect, it } from 'vitest'
import manifest from '../domains/arithmetic/diagnosticTasks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../domains/arithmetic/diagnosticGridModel.js'
import { analyzeDiagnosticVisibleResult } from '../domains/arithmetic/diagnosticVisibleResult.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { contrastFollowUpEligible } from './practiceModes.js'

const task = manifest.tasks.find(t => t.taskId === 'sub-exchange-003') // 652 − 128 = 524

function notebook(rows, answer) {
  let grid = createDiagnosticGrid({ attemptId: 'A', taskId: task.taskId, taskVersion: task.taskVersion })
  for (const [row, cells] of rows.entries()) for (const [column, after] of Object.entries(cells)) {
    grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row, column: Number(column) }, layer: 'main', before: '', after }, grid.events.length + 1)
  }
  return recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: answer }, grid.events.length + 1)
}
// Exchange marks above the first number, then the column calculation.
const working = [{ 6: '4', 7: '1' }, { 5: '6', 6: '5', 7: '2' }, { 4: '−', 5: '1', 6: '2', 7: '8' }, { 4: '─', 5: '─', 6: '─', 7: '─' }, { 5: '5', 6: '2', 7: '4' }]
const entry = answer => ({ source: 'screening', ref: `r${answer}`, reference: { attemptId: `a${answer}` },
  question: { taskId: task.taskId, taskVersion: task.taskVersion, operation: 'subtraction', operands: task.operands },
  answer: { status: answer === '524' ? 'correct' : 'incorrect', studentAnswer: answer, correctAnswer: 524 },
  interpretation: { patterns: [] }, context: {}, detail: { snapshot: notebook(working, answer) } })

describe('notebook working versus entered answer', () => {
  it('reads past an exchange-mark row only when asked to', () => {
    const snapshot = notebook(working, '542')
    expect(analyzeDiagnosticVisibleResult(task, snapshot).status).toBe('unknown')
    expect(analyzeDiagnosticVisibleResult(task, snapshot, { allowExchangeMarks: true }))
      .toMatchObject({ status: 'observed', consistency: 'different', visibleResult: 524, explicitAnswer: 542 })
  })

  it('treats a correct notebook with a different entered answer as an input signal', () => {
    const [result] = addPredictableEvidence([entry('542')])
    const predictable = result.interpretation.predictable
    expect(predictable.status).toBe('matched')
    expect(predictable.matches[0]).toMatchObject({ modelId: 'notebook_answer_mismatch', predictedAnswer: 542 })
    expect(contrastFollowUpEligible({ basis: 'rule_candidate', signalCode: 'notebook_answer_mismatch', supportRefs: ['r542'] },
      { evidence: [result] })).toBe(false)
  })

  it('does nothing when the entered answer is correct', () => {
    const [result] = addPredictableEvidence([entry('524')])
    expect(result.interpretation.predictable.matches.map(m => m.modelId)).not.toContain('notebook_answer_mismatch')
  })
})
