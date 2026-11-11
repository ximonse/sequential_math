import { describe, expect, it } from 'vitest'
import { decimalMultiplicationPackage as pack, decimalMultiplicationTasks as tasks } from '../domains/arithmetic/decimalMultiplicationPackage.js'
import { summarizeDiagnosticObservation } from '../domains/arithmetic/diagnosticObservation.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../domains/arithmetic/diagnosticGridModel.js'
import { validateTeachingRecord, resolveDidacticPlan } from './didacticFollowUp.js'
import { planFollowUp } from '../domains/predictableErrors/followUpSelection.js'
import manifest from '../domains/arithmetic/diagnosticTasks.v1.json' with { type: 'json' }
import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'

const report = { hypotheses: [{ id: 'H', signalCode: pack.modelId }] }
const note = { kind: 'teaching', hypothesisId: 'H', packageId: pack.id, packageVersion: 1, draftId: 'D', materialVersion: 1,
  taughtOn: '2026-01-01', help: 'unknown', noteSv: 'Discussed tenths, not a diagnosis.' }
describe('approved decimal multiplication pilot', () => {
  it('grades every approved question independently, accepts decimal comma and trailing zeros, and preserves incomplete answers', () => {
    const expected = [46.9, 7.2, 18, 10, 28.2, 28.8, 6.8]
    for (const [index, task] of tasks.entries()) {
      const answer = value => summarizeDiagnosticObservation(task, recordDiagnosticGridEvent(
        createDiagnosticGrid({ attemptId: 'A', taskId: task.taskId, taskVersion: 1 }),
        { type: 'answer_change', before: '', after: value }, 1))
      expect(answer(String(expected[index]).replace('.', ','))).toMatchObject({ expectedAnswer: expected[index], answerStatus: 'correct' })
      expect(answer('')).toMatchObject({ answerStatus: 'unanswered' })
      expect(answer('7,').answerStatus).toBe('incomplete')
    }
    const task = tasks[1], grid = createDiagnosticGrid({ attemptId: 'A', taskId: task.taskId, taskVersion: 1 })
    expect(summarizeDiagnosticObservation(task, recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: '7,20' }, 1)).answerStatus).toBe('correct')
  })
  it('keeps teaching and non-discriminating questions out of the contrast selection', () => {
    const selected = planFollowUp({ modelId: pack.modelId, supportProblems: [{ domain: 'arithmetic', type: 'multiplication', values: { a: 7, b: 6.7 } }] })
    expect(selected.items.map(item => item.taskId)).toEqual(tasks.filter(task => task.didacticRole === 'contrast').map(task => task.taskId))
    expect(selected.unresolved).toEqual([])
  })
  it('does not offer the reserved pilot tasks for a different target model when its old bank is exhausted', () => {
    const seen = new Set(manifest.tasks.filter(task => Array.isArray(task.operands))
      .map(task => questionFingerprint({ domain: 'arithmetic', type: task.operation, values: { a: task.operands[0], b: task.operands[1] } })))
    const selected = planFollowUp({ modelId: 'place_value_scaling', seenFingerprints: seen,
      supportProblems: [{ domain: 'arithmetic', type: 'multiplication', values: { a: 7, b: 8 } }] })
    expect(selected.status).toBe('unavailable')
  })
  it('requires a valid versioned note, preserves unknown help and rejects forged stages or missing teaching', () => {
    expect(validateTeachingRecord(note, report).help).toBe('unknown')
    for (const change of [{ taughtOn: '2026-02-30' }, { help: 'independent' }, { noteSv: '' }, { hypothesisId: 'OTHER' }, { packageVersion: 2 }]) {
      expect(() => validateTeachingRecord({ ...note, ...change }, report)).toThrow()
    }
    const input = { packageId: pack.id, packageVersion: 1, phase: 'independent_check', teachingRevision: 1 }
    const options = { modelId: pack.modelId, reportReview: { reportId: 'R', hypothesisId: 'H' },
      items: tasks.filter(task => task.didacticRole === 'independent_check').map(task => ({ task })),
      reportState: { reports: [{ id: 'R', checkIns: [{ revision: 1, createdAt: 1, teaching: note }] }] } }
    expect(resolveDidacticPlan(input, options).teaching).toMatchObject({ noteSv: note.noteSv, help: 'unknown', checkInRevision: 1 })
    expect(() => resolveDidacticPlan(input, { ...options, reportState: { reports: [] } })).toThrow()
    expect(() => resolveDidacticPlan(input, { ...options, items: [{ task: tasks.find(task => task.didacticRole === 'teaching') }] })).toThrow()
  })
})
