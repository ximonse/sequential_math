import { describe, expect, it } from 'vitest'
import { buildRepeatCheck, factCustomTask, isSimpleFact, repeatOutcome } from './repeatCheck.js'

const entry = (ref, operation, a, b, studentAnswer, correct) => ({ ref, source: 'practice',
  question: { operation, values: { a, b } }, answer: { status: correct ? 'correct' : 'incorrect', studentAnswer } })
const wrong = entry('w', 'multiplication', 7, 8, 48, false)
const right = entry('r', 'multiplication', 6, 7, 42, true)
const records = [{ basis: { supportRefs: ['w'], counterRefs: ['r'] }, evidence: { entries: [wrong, right] } }]

describe('fråga igen', () => {
  it('only treats tables and small sums and differences as simple facts', () => {
    expect(isSimpleFact(wrong)).toBe(true)
    expect(isSimpleFact(entry('x', 'multiplication', 23, 4, 82, false))).toBe(false)
    expect(isSimpleFact(entry('y', 'addition', 9, 8, 16, false))).toBe(true)
    expect(isSimpleFact(entry('z', 'addition', 4, 88, 82, false))).toBe(false)
  })

  it('freezes each fact with the earlier wrong answer and its key', () => {
    const plan = buildRepeatCheck({ schemaVersion: 1, facts: [{ basisIndex: 0, ref: 'w', customIndex: 0 }],
      fillers: [{ basisIndex: 0, ref: 'r', customIndex: 1 }] }, { records, customTasks: [factCustomTask(wrong), factCustomTask(right)] })
    expect(plan.facts).toEqual([{ prompt: '7 · 8', correct: 56, previousAnswer: 48, sourceRef: 'w' }])
    expect(plan.fillers).toEqual([{ prompt: '6 · 7', correct: 42, sourceRef: 'r' }])
  })

  it('refuses a fact that is not the pupil’s own wrong answer or a task with another key', () => {
    const tasks = [factCustomTask(wrong), factCustomTask(right)]
    expect(() => buildRepeatCheck({ schemaVersion: 1, facts: [{ basisIndex: 0, ref: 'r', customIndex: 1 }], fillers: [] },
      { records, customTasks: tasks })).toThrow(/egna svar/)
    expect(() => buildRepeatCheck({ schemaVersion: 1, facts: [{ basisIndex: 0, ref: 'w', customIndex: 0 }], fillers: [] },
      { records, customTasks: [{ ...tasks[0], answerKey: { format: 'number', expected: [48] } }] })).toThrow(/stämmer inte/)
  })

  it('tells a slip from a learnt wrong fact and from guessing', () => {
    const fact = { prompt: '7 · 8', correct: 56, previousAnswer: 48 }
    expect(repeatOutcome(fact, { answer: { status: 'correct', studentAnswer: '56' } })).toBe('correct')
    expect(repeatOutcome(fact, { answer: { status: 'incorrect', studentAnswer: '48' } })).toBe('same_wrong')
    expect(repeatOutcome(fact, { answer: { status: 'incorrect', studentAnswer: '54' } })).toBe('other_wrong')
    expect(repeatOutcome(fact, undefined)).toBe('unanswered')
  })
})
