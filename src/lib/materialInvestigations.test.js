import { describe, expect, it } from 'vitest'
import { buildMaterialInvestigations, MULTI_MAX_TARGETS } from './materialInvestigation.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { PREDICTABLE_RULE_VERSION } from '../domains/predictableErrors/core.js'
import manifest from '../domains/arithmetic/diagnosticTasks.v1.json'

const target = (modelId, taskIds, basisIndexes) => ({ schemaVersion: 1, modelId, ruleVersion: PREDICTABLE_RULE_VERSION, taskIds, basisIndexes })
const record = (ref, operation, operands, studentAnswer, correctAnswer) => ({
  basis: { studentId: 'P', classId: 'C', snapshotRevision: 'revision', supportRefs: [ref] },
  evidence: { entries: addPredictableEvidence([{ ref, source: 'screening', question: { operation, operands },
    answer: { status: 'incorrect', studentAnswer, correctAnswer } }]) } })
// Subtraction: larger minus smaller in each column. Addition: the carry is lost.
const subtraction = () => record('sub', 'subtraction', [47, 29], 22, 18)
const addition = () => record('add', 'addition', [47, 38], 75, 85)
const task = id => ({ task: manifest.tasks.find(item => item.taskId === id) })
const SUB = ['sub-exchange-003', 'sub-exchange-004'], ADD = ['add-carry-001', 'add-tens-carry-001']
const options = (records = [subtraction(), addition()], ids = [...SUB, ...ADD]) => ({ kind: 'screening', mode: 'specific',
  audience: { pupils: [{ studentId: 'P' }] }, classContexts: { P: 'C' }, records, items: ids.map(task) })
const two = () => [target('smaller_minus_larger', SUB, [0]), target('carry_forget', ADD, [1])]

describe('several suspicions in one screening', () => {
  it('builds one frozen plan per suspicion from its own questions and support answers', () => {
    const plans = buildMaterialInvestigations(two(), options())
    expect(plans.map(plan => plan.modelId)).toEqual(['smaller_minus_larger', 'carry_forget'])
    expect(plans[0].taskIds).toEqual(SUB)
    expect(plans[0].pupils[0].questions.map(question => question.taskId)).toEqual(SUB)
    expect(plans[0].pupils[0].sources[0].supportRefs).toEqual(['sub'])
    expect(plans[1].pupils[0].questions.map(question => question.taskId)).toEqual(ADD)
    expect(plans[1].pupils[0].sources[0].supportRefs).toEqual(['add'])
  })

  it('needs every question and support answer to belong to exactly one suspicion', () => {
    expect(() => buildMaterialInvestigations([target('smaller_minus_larger', SUB, [0]), target('carry_forget', [SUB[0], ...ADD], [1])], options())).toThrow(/fråga/)
    expect(() => buildMaterialInvestigations([target('smaller_minus_larger', [SUB[0]], [0]), target('carry_forget', ADD, [1])], options())).toThrow(/fråga/)
    expect(() => buildMaterialInvestigations([target('smaller_minus_larger', SUB, [0, 1]), target('carry_forget', ADD, [1])], options())).toThrow(/underlag/)
  })

  it('refuses rival suspicions, didactic packages, a single target and too many targets', () => {
    const rival = record('rival', 'subtraction', [47, 29], 28, 18)
    expect(() => buildMaterialInvestigations([target('smaller_minus_larger', [SUB[0]], [0]), target('exchange_not_decremented', [SUB[1]], [1])],
      options([subtraction(), rival], SUB))).toThrow(/samma svar/)
    expect(() => buildMaterialInvestigations([{ ...two()[0], didactic: { packageId: 'x' } }, two()[1]], options())).toThrow(/Ogiltig/)
    expect(() => buildMaterialInvestigations([two()[0]], options())).toThrow(/minst två/)
    expect(() => buildMaterialInvestigations(Array.from({ length: MULTI_MAX_TARGETS + 1 }, () => two()[0]), options())).toThrow(/högst/)
  })
})
