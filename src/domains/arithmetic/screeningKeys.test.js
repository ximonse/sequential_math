import { describe, expect, it } from 'vitest'
import ncmBank from './ncmScreeningTasks.v1.json' with { type: 'json' }
import bank from './diagnosticTasks.v1.json' with { type: 'json' }
import { MANUAL_KEYS, NCM_STRUCTURE, NCM_WITHOUT_STRUCTURE, NO_KEY_REASON, manualKeyMatch, ownCalculation, screeningStructure } from './screeningKeys.js'
import { checkNcmAnswer } from './ncmAnswerCheck.js'
import { predictableCandidates } from '../predictableErrors/index.js'
import { MISCONCEPTIONS, NOT_A_MISCONCEPTION_REASONS } from '../predictableErrors/misconceptions.js'
import { addPredictableEvidence } from '../../lib/evidencePredictableAnalysis.js'

// Rule R-B in docs/STYRNING_FELFORSTAELSER.md: no screening task without a
// wrong-answer key, or a stated reason why there is none yet.
const ncmIds = ncmBank.tasks.map(task => task.taskId)

describe('screening keys', () => {
  it('gives every NCM task a structure or a reason, never both', () => {
    for (const id of ncmIds) expect(Boolean(NCM_STRUCTURE[id]) !== Boolean(NCM_WITHOUT_STRUCTURE[id]), id).toBe(true)
    for (const id of [...Object.keys(NCM_STRUCTURE), ...Object.keys(NCM_WITHOUT_STRUCTURE)]) expect(ncmIds, id).toContain(id)
  })

  it('computes the bank facit from every structure', () => {
    for (const [id, problem] of Object.entries(NCM_STRUCTURE)) {
      const task = ncmBank.tasks.find(item => item.taskId === id)
      const result = predictableCandidates(problem, '')
      expect(result.status, id).not.toBe('not_applicable')
      expect(checkNcmAnswer(task, String(result.computedCorrect).replace('.', ',')), `${id}: ${result.computedCorrect}`).toBe('correct')
    }
  })

  it('gives every task in both banks a key or a reason', () => {
    for (const id of ncmIds) {
      const keyed = NCM_STRUCTURE[id] || MANUAL_KEYS[id]?.length || NO_KEY_REASON[id]
      expect(keyed, id).toBeTruthy()
    }
    for (const task of bank.tasks) {
      const problem = task.operands ? { domain: 'arithmetic', type: task.operation, values: { a: task.operands[0], b: task.operands[1] } }
        : { domain: task.domain, type: task.domain, skill: task.domain, values: task.values }
      expect(predictableCandidates(problem, '').predictions?.length, task.taskId).toBeGreaterThan(0)
    }
  })

  it('points every manual key to a misconception or a fixed reason, and says who proposed it', () => {
    for (const [id, keys] of Object.entries(MANUAL_KEYS)) {
      expect(ncmIds, id).toContain(id)
      for (const key of keys) {
        expect(Boolean(key.misconception) !== Boolean(key.reason), id).toBe(true)
        if (key.misconception) expect(MISCONCEPTIONS[key.misconception], `${id}: ${key.misconception}`).toBeTruthy()
        if (key.reason) expect(NOT_A_MISCONCEPTION_REASONS, id).toContain(key.reason)
        expect(['source', 'agent', 'simon_observation'], id).toContain(key.basis)
        expect(['awaiting_review', 'approved'], id).toContain(key.status)
        const task = ncmBank.tasks.find(item => item.taskId === id)
        // A key never names the right answer.
        expect(checkNcmAnswer(task, key.expected.join(key.format === 'fraction' ? '/' : ' ').replace('.', ',')), `${id}: ${key.expected}`).not.toBe('correct')
      }
    }
  })

  it('reads the numbers of a bare calculation the teacher wrote, and nothing else', () => {
    expect(ownCalculation('Räkna ut 864 / 4.')).toMatchObject({ type: 'division', values: { a: 864, b: 4 } })
    expect(ownCalculation('Beräkna 3,26 + 8,37')).toMatchObject({ type: 'addition', values: { a: 3.26, b: 8.37 } })
    expect(ownCalculation('55/5')).toMatchObject({ type: 'division', values: { a: 55, b: 5 } })
    expect(ownCalculation('Skriv 3/4 som decimaltal.')).toBeNull()
    expect(ownCalculation('Hur mycket är 3 + 4 kr?')).toBeNull()
    expect(screeningStructure({ taskId: 'custom-abc', promptSv: 'Räkna ut 864 / 4.' })).toMatchObject({ status: 'added' })
    expect(screeningStructure({ taskId: 'custom-abc', promptSv: 'Rita en triangel.' })).toEqual({ status: 'none' })
    // A wrong key on the teacher's question is caught: the computed answer must match it.
    const [entry] = addPredictableEvidence([{ source: 'screening', question: { taskId: 'custom-abc', taskVersion: 1, promptSv: 'Räkna ut 864 / 4.' },
      answer: { status: 'incorrect', studentAnswer: '211', correctAnswer: '216' } }])
    expect(entry.interpretation.predictable.matches.map(match => match.modelId)).toContain('div_remainder_ignored')
  })

  it('adds structure only to the bank task in the same version and wording', () => {
    const task = ncmBank.tasks.find(item => item.taskId === 'ncm-RD2-6b')
    const question = { taskId: task.taskId, taskVersion: task.taskVersion, promptSv: task.promptSv }
    expect(screeningStructure(question).status).toBe('added')
    expect(screeningStructure({ ...question, promptSv: 'Räkna ut 1 − 0,7' }).status).toBe('task_changed')
    expect(screeningStructure({ ...question, taskVersion: 2 }).status).toBe('task_changed')
    expect(manualKeyMatch({ ...question, promptSv: 'annan' }, '0,74')).toBeNull()
  })

  it('analyses an old NCM answer without changing its source fields', () => {
    const task = ncmBank.tasks.find(item => item.taskId === 'ncm-RD2-6b')
    const entry = { source: 'screening', ref: 'r', reference: { kind: 'screening_attempt', attemptId: 'a' },
      question: { taskId: task.taskId, taskVersion: 1, promptSv: task.promptSv, answerType: 'number' },
      answer: { status: 'incorrect', studentAnswer: '0,74', correctAnswer: '0,25' }, context: {}, interpretation: { category: 'unknown', patterns: [] } }
    const [analysed] = addPredictableEvidence([entry])
    expect(analysed.interpretation.predictable.matches.map(m => m.modelId)).toContain('decimal_whole_under_last_decimal')
    expect(analysed.question.structureSource).toBe('screening_keys')
    expect(analysed.answer).toEqual(entry.answer)
  })
})
