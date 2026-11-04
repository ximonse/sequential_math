import { describe, expect, it } from 'vitest'
import manifest from './diagnosticTasks.v1.json'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { summarizeDiagnosticScreening } from './diagnosticScreeningSummary.js'
import { addPredictableEvidence } from '../../lib/evidencePredictableAnalysis.js'
import { comparableRuleCounter } from '../../lib/pupilRuleHypotheses.js'

const task = manifest.tasks.find(item => item.analysisCaseId === 'S2')
function work(answer, visible = null, shifted = false) {
  let grid = createDiagnosticGrid({ attemptId: 'MATRIX', taskId: task.taskId, taskVersion: task.taskVersion })
  if (visible !== null) {
    const rows = [{ 5: '4', 6: '0', 7: '2' },
      shifted ? { 3: '−', 4: '1', 5: '7', 6: '8' } : { 4: '−', 5: '1', 6: '7', 7: '8' },
      { 4: '─', 5: '─', 6: '─', 7: '─' }, { 5: visible[0], 6: visible[1], 7: visible[2] }]
    for (const [row, cells] of rows.entries()) for (const [column, after] of Object.entries(cells)) {
      grid = recordDiagnosticGridEvent(grid, { type: 'write', position: { row, column: Number(column) }, layer: 'main', before: '', after }, grid.events.length + 1)
    }
  }
  return recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: answer }, grid.events.length + 1)
}
describe('screening matrix evidence signals', () => {
  it('does not turn a wrong final answer into a method diagnosis', () => {
    expect(summarizeDiagnosticScreening(task, work('376'))).toMatchObject({ explicitAnswer: '376', expectedAnswer: 224, answerStatus: 'incorrect', signals: [] })
    expect(summarizeDiagnosticScreening(task, work('224'))).toMatchObject({ answerStatus: 'correct', signals: [] })
    expect(summarizeDiagnosticScreening(task, work(''))).toMatchObject({ explicitAnswer: null, answerStatus: 'unanswered' })
    expect(summarizeDiagnosticScreening(task, work('-'))).toMatchObject({ explicitAnswer: '-', answerStatus: 'incomplete' })
  })
  it('uses the actual setup to distinguish method, shifted columns and different answers', () => {
    expect(summarizeDiagnosticScreening(task, work('376', '376')).signals.map(s => s.code)).toEqual(['M'])
    expect(summarizeDiagnosticScreening(task, work('224', '376')).signals.map(s => s.code)).toEqual(['Ö'])
    expect(summarizeDiagnosticScreening(task, work('376', '376', true)).signals.map(s => s.code)).toEqual(['P'])
  })
  it('preserves contradictory visible work alongside a correct final answer in the common evidence layer', () => {
    const snapshot = work('224', '376')
    const [entry] = addPredictableEvidence([{ source: 'screening', reference: { attemptId: 'MATRIX' }, question: task,
      answer: { status: 'correct', studentAnswer: '224', correctAnswer: 224 }, detail: { snapshot } }])
    expect(entry.interpretation.predictable.status).toBe('correct')
    expect(entry.interpretation.work.signals).toEqual(summarizeDiagnosticScreening(task, snapshot).signals)
    expect(entry.interpretation.work.signals.map(signal => signal.code)).toEqual(['Ö'])
    expect(entry.interpretation.work.visibleResult).toMatchObject({ status: 'observed', consistency: 'different', visibleResult: 376 })
    const [support] = addPredictableEvidence([{ source: 'screening', reference: { attemptId: 'OTHER' }, question: task,
      answer: { status: 'incorrect', studentAnswer: '376', correctAnswer: 224 } }])
    expect(comparableRuleCounter(entry, [support], 'smaller_minus_larger')).toBe(false)
  })
})
