import { describe, expect, it } from 'vitest'
import approved from '../../docs/evaluations/e4-decimal-addition-2026-11-05/package.json' with { type: 'json' }
import { decimalAdditionPackage as pack, decimalAdditionTasks as tasks, decimalAdditionStructure } from '../domains/arithmetic/decimalAdditionPackage.js'
import { decimalSubtractionTasks } from '../domains/arithmetic/decimalSubtractionPackage.js'
import { summarizeDiagnosticObservation } from '../domains/arithmetic/diagnosticObservation.js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../domains/arithmetic/diagnosticGridModel.js'
import { predictableCandidates, candidatesForEvidence } from '../domains/predictableErrors/index.js'
import { buildContrastSet } from '../domains/predictableErrors/contrast.js'
import { planFollowUp } from '../domains/predictableErrors/followUpSelection.js'
import { modelDescription } from '../domains/predictableErrors/modelDescriptions.js'
import { PREDICTABLE_RULE_VERSION } from '../domains/predictableErrors/core.js'
import { validateTeachingRecord, resolveDidacticPlan, didacticPackage } from './didacticFollowUp.js'
import { buildMaterialInvestigation, investigationMatches, investigationObservations } from './materialInvestigation.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'

const problem = (a = 3.48, b = 2.67) => ({ domain: 'arithmetic', type: 'addition', values: { a, b } })
const contrasts = tasks.filter(task => task.didacticRole === 'contrast')
const records = (a = 3.48, b = 2.67, answer = 6.05, correct = 6.15) => [{
  basis: { studentId: 'P', classId: 'C', supportRefs: ['S'] }, evidence: { entries: addPredictableEvidence([
    { ref: 'S', source: 'screening', question: { domain: 'arithmetic', operation: 'addition', operands: [a, b] },
      answer: { status: 'incorrect', studentAnswer: answer, correctAnswer: correct } },
  ]) },
}]
const options = () => ({ kind: 'screening', mode: 'specific', audience: { pupils: [{ studentId: 'P' }] },
  classContexts: { P: 'C' }, reportReview: { studentId: 'P', reportId: 'R', hypothesisId: 'H' }, records: records(),
  items: contrasts.map(task => ({ task })) })
const input = () => ({ schemaVersion: 1, modelId: 'one_carry_forgotten', ruleVersion: PREDICTABLE_RULE_VERSION })

describe('approved independent-carry decimal addition', () => {
  it('grades every approved task exactly with comma/extra zeros and preserves unfinished raw input', () => {
    for (const [index, task] of tasks.entries()) {
      const expected = Number(approved.tasks[index].correct)
      expect(predictableCandidates(problem(...task.operands), '').computedCorrect).toBe(expected)
      const grid = createDiagnosticGrid({ attemptId: 'A', taskId: task.taskId, taskVersion: 1 })
      const grade = value => summarizeDiagnosticObservation(task, recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: value }, 1))
      expect(grade(`${approved.tasks[index].correct.replace('.', ',')}0`)).toMatchObject({ expectedAnswer: expected, answerStatus: 'correct' })
      expect(grade('')).toMatchObject({ answerStatus: 'unanswered' })
      expect(grade('6,')).toMatchObject({ explicitAnswer: '6,', answerStatus: 'incomplete' })
      expect(grade('999').answerStatus).toBe('incorrect')
    }
  })
  it('preserves both omitted-position variants and separates them from omitting all carries', () => {
    for (const row of approved.tasks.filter(task => task.phase !== 'negative_control')) {
      const p = problem(Number(row.a), Number(row.b))
      for (const answer of row.oneCarryOmitted) expect(predictableCandidates(p, answer).matches.map(m => m.modelId)).toEqual(['one_carry_forgotten'])
      expect(predictableCandidates(p, row.allCarriesOmitted).matches.map(m => m.modelId)).toEqual(['carry_forget'])
      for (const status of ['partial', 'unanswered']) expect(candidatesForEvidence({ question: { domain: 'arithmetic', operation: 'addition', values: p.values },
        answer: { status, studentAnswer: row.oneCarryOmitted[0], correctAnswer: row.correct } }).status).toBe('not_applicable')
    }
    const negative = predictableCandidates(problem(2.13, 3.24), '5,37')
    expect(negative.status).toBe('correct')
    expect(negative.nonDiscriminatingModelIds).toContain('carry_forget')
    expect(negative.predictions.some(p => p.modelId === 'one_carry_forgotten')).toBe(false)
  })
  it('retains dependent-carry overlap but excludes it and other structures from the approved bank route', () => {
    const dependent = problem(3.48, 2.57)
    expect(decimalAdditionStructure(dependent.values)).toBe('dependent_carries')
    expect(predictableCandidates(dependent, '5,95').matches.map(m => m.modelId)).toEqual(['carry_forget', 'one_carry_forgotten'])
    const set = buildContrastSet({ modelId: 'carry_forget', supportProblems: [problem()],
      bankTasks: [{ taskId: 'outside', taskVersion: 1, operation: 'addition', operands: [3.48, 2.57] }] })
    expect(set.unresolved).toContainEqual(['carry_forget', 'one_carry_forgotten'])
    for (const [a, b] of [[3.48, 2.57], [3.48, 2.37], [3.4, 2.67], [7.68, 3.57]]) {
      expect(planFollowUp({ modelId: 'carry_forget', supportProblems: [problem(a, b)] }).items).toEqual([])
    }
    expect(predictableCandidates(problem(3.48, 2.37), '').predictions.some(m => m.modelId === 'one_carry_forgotten')).toBe(false)
    expect(didacticPackage('carry_forget', 'addition')).toBe(null)
  })
  it('freezes both variants with the target and rival, and matches either answer without changing old comparisons', () => {
    for (const modelId of pack.modelIds) {
      const set = planFollowUp({ modelId, supportProblems: [problem()] })
      expect(set.items.map(item => item.taskId)).toEqual(contrasts.map(task => task.taskId))
      expect(set.unresolved).toEqual([])
    }
    const plan = buildMaterialInvestigation(input(), options())
    expect(plan.pupils[0].rivalModelIds).toEqual(['carry_forget'])
    const question = plan.pupils[0].questions[0]
    expect(question.predictions.one_carry_forgotten).toEqual([4.24, 3.34])
    for (const answer of ['4,24', '3,34']) expect(investigationMatches(question, answer)).toEqual(['one_carry_forgotten'])
    const entry = { ref: 'A', question: { taskId: question.taskId, taskVersion: 1 },
      answer: { status: 'incorrect', studentAnswer: '3,34', correctAnswer: 4.34 },
      interpretation: { predictable: predictableCandidates(problem(1.76, 2.58), '3,34') } }
    const old = { ...plan.pupils[0], questions: [{ ...question, predictions: { carry_forget: [3.24] } }] }
    expect(investigationObservations(old, [entry])).toMatchObject({ compatible: true,
      observations: { models: [] }, newModels: [{ modelId: 'one_carry_forgotten', count: 1 }] })
  })
  it('rejects a dependent source at the server boundary and rejects mixed-package teaching/control bindings', () => {
    expect(() => buildMaterialInvestigation(input(), { ...options(), records: records(3.48, 2.57, 5.95, 6.05) })).toThrow(/avgränsning/)
    const teaching = { kind: 'teaching', hypothesisId: 'H', packageId: pack.id, packageVersion: 1,
      draftId: 'D', materialVersion: 1, taughtOn: '2026-11-05', help: 'unknown', noteSv: 'Discussed what each carried one is worth.' }
    const report = { hypotheses: [{ id: 'H', signalCode: 'one_carry_forgotten' }] }
    expect(validateTeachingRecord(teaching, report).help).toBe('unknown')
    const control = { packageId: pack.id, packageVersion: 1, phase: 'independent_check', teachingRevision: 1 }
    const context = { modelId: 'one_carry_forgotten', reportReview: { reportId: 'R', hypothesisId: 'H' },
      items: tasks.filter(t => t.didacticRole === 'independent_check').map(task => ({ task })),
      reportState: { reports: [{ id: 'R', checkIns: [{ revision: 1, createdAt: 1, teaching }] }] } }
    expect(resolveDidacticPlan(control, context).teaching).toMatchObject({ packageId: pack.id, help: 'unknown' })
    expect(() => resolveDidacticPlan(control, { ...context, items: [{ task: decimalSubtractionTasks[4] }] })).toThrow()
    expect(modelDescription('one_carry_forgotten', 'decimal_addition').thinkingSv).toContain('Båda positionerna')
  })
})
