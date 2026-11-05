import { describe, expect, it } from 'vitest'
import approved from '../../docs/evaluations/e4-decimal-subtraction-2026-11-05/package.json' with { type: 'json' }
import { decimalSubtractionPackage as pack, decimalSubtractionTasks as tasks } from '../domains/arithmetic/decimalSubtractionPackage.js'
import { decimalMultiplicationTasks } from '../domains/arithmetic/decimalMultiplicationPackage.js'
import { summarizeDiagnosticObservation } from '../domains/arithmetic/diagnosticObservation.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../domains/arithmetic/diagnosticGridModel.js'
import { predictableCandidates } from '../domains/predictableErrors/index.js'
import { planFollowUp } from '../domains/predictableErrors/followUpSelection.js'
import { modelDescription } from '../domains/predictableErrors/modelDescriptions.js'
import { PREDICTABLE_RULE_VERSION } from '../domains/predictableErrors/core.js'
import { validateTeachingRecord, resolveDidacticPlan, didacticPackage } from './didacticFollowUp.js'
import { investigationObservations, buildMaterialInvestigation } from './materialInvestigation.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'

const problem = (a = 6.42, b = 2.17) => ({ domain: 'arithmetic', type: 'subtraction', values: { a, b } })
const contrasts = tasks.filter(task => task.didacticRole === 'contrast')
describe('approved single-exchange decimal subtraction', () => {
  it('grades the approved content independently and retains comma, trailing zeros, empty and unfinished input', () => {
    for (const [index, task] of tasks.entries()) {
      const expected = Number(approved.tasks[index].correct)
      expect(predictableCandidates(problem(...task.operands), '').computedCorrect).toBe(expected)
      const grid = createDiagnosticGrid({ attemptId: 'A', taskId: task.taskId, taskVersion: 1 })
      const answer = value => summarizeDiagnosticObservation(task, recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: value }, 1))
      expect(answer(`${approved.tasks[index].correct.replace('.', ',')}0`)).toMatchObject({ expectedAnswer: expected, answerStatus: 'correct' })
      expect(answer('')).toMatchObject({ answerStatus: 'unanswered' })
      expect(answer('5,')).toMatchObject({ explicitAnswer: '5,', answerStatus: 'incomplete' })
      expect(answer('999').answerStatus).toBe('incorrect')
    }
  })
  it('preserves source overlap but distinguishes all three rivals on both contrasts', () => {
    expect(predictableCandidates(problem(), '4,35').matches.map(m => m.modelId)).toEqual(['smaller_minus_larger', 'exchange_not_decremented'])
    for (const row of approved.tasks.filter(task => task.phase === 'contrast')) {
      const p = problem(Number(row.a), Number(row.b))
      for (const [field, modelId] of [['absoluteColumns', 'smaller_minus_larger'], ['zeroColumn', 'borrow_forget'], ['undecrementedDonor', 'exchange_not_decremented']]) {
        expect(predictableCandidates(p, row[field]).matches.map(m => m.modelId)).toEqual([modelId])
      }
    }
    const negative = predictableCandidates(problem(8.64, 3.21), '5,43')
    expect(negative.status).toBe('correct')
    expect(negative.nonDiscriminatingModelIds).toEqual(expect.arrayContaining(pack.modelIds))
    for (const a of [0.42, 6.42]) {
      const b = a < 1 ? 0.17 : 6.17
      expect(predictableCandidates(problem(a, b), '0,35').matches.map(m => m.modelId)).toEqual(['smaller_minus_larger', 'exchange_not_decremented'])
    }
  })
  it('offers only two new contrasts for each supported rule, never teaching/control tasks or a different content structure', () => {
    for (const modelId of pack.modelIds) {
      const set = planFollowUp({ modelId, supportProblems: [problem()] })
      expect(set.items.map(item => item.taskId)).toEqual(contrasts.map(task => task.taskId))
      expect(set.unresolved).toEqual([])
    }
    for (const [a, b] of [[6.02, 2.17], [6.12, 2.37], [6.42, 5.67], [6.4, 2.17], [6.421, 2.173], [64.42, 22.17]]) {
      expect(predictableCandidates(problem(a, b), '').predictions.some(m => m.modelId === 'exchange_not_decremented')).toBe(false)
      expect(planFollowUp({ modelId: 'smaller_minus_larger', supportProblems: [problem(a, b)] }).items).toEqual([])
    }
    expect(didacticPackage('smaller_minus_larger', 'subtraction')).toBe(null)
    expect(didacticPackage('smaller_minus_larger', 'decimal_subtraction')).toBe(pack)
  })
  it('requires package-specific teaching and rejects mixed package tasks and unknown packages', () => {
    const teaching = { kind: 'teaching', hypothesisId: 'H', packageId: pack.id, packageVersion: 1,
      draftId: 'D', materialVersion: 1, taughtOn: '2026-11-05', help: 'unknown', noteSv: 'Discussed equivalent place values.' }
    const report = { hypotheses: [{ id: 'H', signalCode: 'exchange_not_decremented' }] }
    expect(validateTeachingRecord(teaching, report).help).toBe('unknown')
    expect(() => validateTeachingRecord({ ...teaching, packageId: 'unknown' }, report)).toThrow()
    expect(() => validateTeachingRecord(teaching, { hypotheses: [{ id: 'H', signalCode: 'decimal_parts_multiplied_separately' }] })).toThrow()
    const options = { modelId: 'exchange_not_decremented', reportReview: { reportId: 'R', hypothesisId: 'H' },
      items: tasks.filter(task => task.didacticRole === 'independent_check').map(task => ({ task })),
      reportState: { reports: [{ id: 'R', checkIns: [{ revision: 1, createdAt: 1, teaching }] }] } }
    const input = { packageId: pack.id, packageVersion: 1, phase: 'independent_check', teachingRevision: 1 }
    expect(resolveDidacticPlan(input, options).teaching).toMatchObject({ packageId: pack.id, help: 'unknown' })
    const wrongNote = structuredClone(options)
    wrongNote.reportState.reports[0].checkIns[0].teaching.packageId = 'decimal-component-multiplication-pilot'
    expect(() => resolveDidacticPlan(input, wrongNote)).toThrow(/undervisningsnotering/)
    expect(() => resolveDidacticPlan(undefined, { ...options, items: [{ task: contrasts[0] }, { task: decimalMultiplicationTasks[1] }] })).toThrow()
  })
  it('rejects out-of-scope source work at the server investigation boundary, even if a client names the right tasks', () => {
    const records = [{ basis: { studentId: 'P', classId: 'C', supportRefs: ['S'] }, evidence: {
      entries: addPredictableEvidence([{ ref: 'S', source: 'screening', question: { domain: 'arithmetic', operation: 'subtraction', operands: [6.02, 2.17] },
        answer: { status: 'incorrect', studentAnswer: 4.15, correctAnswer: 3.85 } }]) } }]
    expect(() => buildMaterialInvestigation({ schemaVersion: 1, modelId: 'smaller_minus_larger', ruleVersion: PREDICTABLE_RULE_VERSION }, {
      kind: 'screening', mode: 'specific', audience: { pupils: [{ studentId: 'P' }] }, classContexts: { P: 'C' },
      reportReview: { reportId: 'R', hypothesisId: 'H' }, records, items: contrasts.map(task => ({ task })),
    })).toThrow(/avgränsning/)
  })
  it('keeps frozen old comparisons separate from newly introduced v8 candidates', () => {
    const frozen = { questions: [{ taskId: 'old', taskVersion: 1, answerType: 'number', correct: 4.25,
      predictions: { smaller_minus_larger: [4.35] } }] }
    const entries = [{ ref: 'S', question: { taskId: 'old', taskVersion: 1 }, answer: { status: 'incorrect', studentAnswer: '4,35', correctAnswer: 4.25 },
      interpretation: { predictable: predictableCandidates(problem(), '4,35') } }]
    const outcome = investigationObservations(frozen, entries)
    expect(outcome.compatible).toBe(true)
    expect(outcome.observations.models).toEqual([{ modelId: 'smaller_minus_larger', count: 1 }])
    expect(outcome.newModels).toEqual([{ modelId: 'exchange_not_decremented', count: 1 }])
    expect(modelDescription('exchange_not_decremented', 'decimal_subtraction').thinkingSv).toContain('hundradelar')
    expect(modelDescription('exchange_not_decremented', 'subtraction').thinkingSv).toContain('ental')
  })
})
