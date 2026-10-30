import { describe, expect, it } from 'vitest'
import { addPredictableEvidence } from './evidencePredictableAnalysis.js'
import { buildRuleHypotheses } from './pupilRuleHypotheses.js'
import { speedSlipSummary, isSpeedTrainingEntry } from './practiceModes.js'

const entry = (id, question, studentAnswer, correctAnswer, source = 'practice') => ({
  source, ref: id, reference: { observationId: id }, question,
  answer: { status: studentAnswer === correctAnswer ? 'correct' : 'incorrect', studentAnswer, correctAnswer },
  interpretation: { patterns: [] }, context: {} })
const bond = (id, answer) => entry(id, { domain: 'number_fluency', skill: 'number_bonds', values: { target: 15, knownTerm: 6, missingFirst: false } }, answer, 9)
const table = (id, answer) => entry(id, { domain: 'arithmetic', operation: 'multiplication', problemType: 'mul_table_drill', values: { a: 7, b: 8 } }, answer, 56)
const freeSub = (id, answer) => entry(id, { domain: 'arithmetic', operation: 'subtraction', problemType: 'sub_2d_borrow', values: { a: 52, b: 38 } }, answer, 14)

describe('speed training versus directed follow-up', () => {
  it('recognises speed training only for practice in fluency skills and table drill', () => {
    expect(isSpeedTrainingEntry(bond('a', 8))).toBe(true)
    expect(isSpeedTrainingEntry(table('b', 57))).toBe(true)
    expect(isSpeedTrainingEntry(freeSub('c', 26))).toBe(false)
    expect(isSpeedTrainingEntry({ ...table('d', 57), source: 'screening' })).toBe(false)
  })

  it('proposes no follow-up question from speed training and summarises single slips', () => {
    const entries = addPredictableEvidence([bond('b1', 8), bond('b2', 10), table('t1', 5), table('t2', 63), freeSub('s1', 26)])
    for (const e of entries.slice(0, 4)) expect(e.interpretation.predictable.nextProbe.status).toBe('not_in_speed_training')
    const hypotheses = buildRuleHypotheses(entries)
    const ids = hypotheses.map(h => h.signalCode)
    expect(ids).not.toContain('answer_off_by_one')
    expect(ids).not.toContain('partial_answer_entry')
    expect(ids).toContain('table_off_by_one')
    expect(hypotheses.find(h => h.signalCode === 'table_off_by_one').nextCheckSv).toMatch(/snabbhetsträning/u)
    expect(ids).toContain('smaller_minus_larger')
    expect(speedSlipSummary(entries)).toEqual({ total: 3, counts: { answer_off_by_one: 2, partial_answer_entry: 1 } })
  })
})
