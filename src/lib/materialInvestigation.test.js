import { describe, expect, it } from 'vitest'
import { buildMaterialInvestigation, investigationMatches, investigationObservations } from './materialInvestigation.js'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { PREDICTABLE_RULE_VERSION } from '../domains/predictableErrors/core.js'
import manifest from '../domains/arithmetic/diagnosticTasks.v1.json'

const input = () => ({ schemaVersion: 1, modelId: 'smaller_minus_larger', ruleVersion: PREDICTABLE_RULE_VERSION })
const records = () => [{ basis: { studentId: 'P', classId: 'C', snapshotRevision: 'revision', supportRefs: ['support'] },
  evidence: { entries: addPredictableEvidence([{ ref: 'support', source: 'screening', question: { operation: 'subtraction', operands: [47, 29] },
    answer: { status: 'incorrect', studentAnswer: 22, correctAnswer: 18 } }]) } }]
const items = () => ['sub-exchange-003', 'sub-exchange-004'].map(id => ({ task: manifest.tasks.find(task => task.taskId === id) }))
const options = () => ({ kind: 'screening', mode: 'specific', audience: { pupils: [{ studentId: 'P' }] }, classContexts: { P: 'C' },
  records: records(), items: items() })

describe('frozen material investigation', () => {
  it('binds the target, rivals and calculated question predictions to each pupil source', () => {
    const plan = buildMaterialInvestigation(input(), options())
    expect(plan).toMatchObject({ schemaVersion: 1, modelId: 'smaller_minus_larger', ruleVersion: PREDICTABLE_RULE_VERSION })
    const pupil = plan.pupils[0]
    expect(pupil).toMatchObject({ studentId: 'P', classId: 'C', sources: [{ snapshotRevision: 'revision', supportRefs: ['support'] }], unresolvedPairs: [] })
    expect(pupil.rivalModelIds).toEqual(['borrow_forget', 'exchange_not_decremented'])
    expect(pupil.questions[0]).toMatchObject({ taskId: 'sub-exchange-003', taskVersion: 1, correct: 524,
      predictions: { smaller_minus_larger: [536], exchange_not_decremented: [534], borrow_forget: [530] } })
    expect(investigationMatches(pupil.questions[0], '536')).toEqual(['smaller_minus_larger'])
    expect(investigationMatches(pupil.questions[0], '524')).toEqual([])
  })
  it('refuses forged predictions, stale rules, absent pupil analysis and a different class', () => {
    expect(() => buildMaterialInvestigation({ ...input(), predictions: {} }, options())).toThrow()
    expect(() => buildMaterialInvestigation({ ...input(), ruleVersion: 'old' }, options())).toThrow(/regelversion/)
    expect(() => buildMaterialInvestigation(input(), { ...options(), audience: { pupils: [{ studentId: 'P' }, { studentId: 'Q' }] } })).toThrow(/underlag/)
    expect(() => buildMaterialInvestigation(input(), { ...options(), classContexts: { P: 'OTHER' } })).toThrow(/klass/)
  })
  it('refuses ungrounded target models, non-discriminating tasks and unsupported material kinds', () => {
    expect(() => buildMaterialInvestigation({ ...input(), modelId: 'carry_forget' }, options())).toThrow(/stödsvar/)
    expect(() => buildMaterialInvestigation(input(), { ...options(), kind: 'practice' })).toThrow(/screening/)
    expect(() => buildMaterialInvestigation(input(), { ...options(), items: [{ task: manifest.tasks.find(t => t.taskId === 'sub-no-borrow-001') }] })).toThrow(/skiljer/)
  })
  it('evaluates frozen predictions even when later analysis presents a different candidate', () => {
    const question = buildMaterialInvestigation(input(), options()).pupils[0].questions[0]
    expect(investigationMatches(question, '534')).toEqual(['exchange_not_decremented'])
    expect(investigationMatches(question, '534abc')).toEqual([])
  })

  it('keeps planned rivals separate from new current-analysis findings and refuses changed grading', () => {
    const plan = buildMaterialInvestigation(input(), options()).pupils[0]
    const entry = { ref: 'answer', question: { taskId: plan.questions[0].taskId, taskVersion: 1 },
      answer: { status: 'incorrect', studentAnswer: '534', correctAnswer: 524 },
      interpretation: { predictable: { matches: [{ modelId: 'phantom_carry' }] } } }
    const outcome = investigationObservations(plan, [entry])
    expect(outcome.compatible).toBe(true)
    expect(outcome.observations.models).toEqual([{ modelId: 'exchange_not_decremented', count: 1 }])
    expect(outcome.newModels).toEqual([{ modelId: 'phantom_carry', count: 1 }])
    expect(investigationObservations(plan, [{ ...entry, answer: { ...entry.answer, correctAnswer: 999 } }]).compatible).toBe(false)
    expect(investigationObservations(plan, [{ ...entry, answer: { ...entry.answer, status: 'correct' } }]).observations).toBe(null)
  })

  it('keeps every possible answer of a model with multiple carry positions', () => {
    const source = records()
    source[0].evidence.entries = addPredictableEvidence([{ ref: 'support', source: 'screening',
      question: { operation: 'addition', operands: [357, 269] }, answer: { status: 'incorrect', studentAnswer: 616, correctAnswer: 626 } }])
    const plan = buildMaterialInvestigation({ ...input(), modelId: 'one_carry_forgotten' }, { ...options(), records: source,
      items: [{ task: { taskId: 'two-carries', taskVersion: 1, operation: 'addition', operands: [357, 268] } }] })
    expect(plan.pupils[0].questions[0].predictions.one_carry_forgotten).toEqual([615, 525])
    expect(investigationMatches(plan.pupils[0].questions[0], '525')).toContain('one_carry_forgotten')
  })

  it('keeps each recipient source and unresolved rivals separate', () => {
    const other = { basis: { studentId: 'Q', classId: 'D', snapshotRevision: 'other-revision', supportRefs: ['other'] },
      evidence: { entries: addPredictableEvidence([{ ref: 'other', source: 'screening', question: { operation: 'subtraction', operands: [100, 5] },
        answer: { status: 'incorrect', studentAnswer: 105, correctAnswer: 95 } }]) } }
    const plan = buildMaterialInvestigation(input(), { ...options(), audience: { pupils: [{ studentId: 'P' }, { studentId: 'Q' }] },
      classContexts: { P: 'C', Q: 'D' }, records: [...records(), other] })
    expect(plan.pupils[0].rivalModelIds).not.toContain('zero_intermediate_ten')
    expect(plan.pupils[1]).toMatchObject({ studentId: 'Q', classId: 'D', sources: [{ snapshotRevision: 'other-revision', supportRefs: ['other'] }] })
    expect(plan.pupils[1].rivalModelIds).toContain('zero_intermediate_ten')
    expect(plan.pupils[1].unresolvedPairs.some(pair => pair.includes('zero_intermediate_ten'))).toBe(true)
  })
})
