import { describe, expect, it } from 'vitest'
import { resultTargets } from './followUpResults.js'

const entry = (taskId, answer) => ({ ref: `${taskId}:${answer}`, question: { taskId, taskVersion: 1 }, answer: { status: 'incorrect', studentAnswer: answer } })

describe('follow-up results with several suspicions', () => {
  it('judges each suspicion only on the answers to its own questions', () => {
    const material = { investigationsRevision: 'r', investigations: [
      { modelId: 'smaller_minus_larger', taskIds: ['sub-1', 'sub-2'] }, { modelId: 'carry_forget', taskIds: ['add-1'] }] }
    const entries = [entry('sub-1', 536), entry('add-1', 75), entry('sub-2', 30)]
    const [subtraction, addition] = resultTargets(material, { investigationRevision: 'r' }, entries)
    expect(subtraction.entries.map(item => item.question.taskId)).toEqual(['sub-1', 'sub-2'])
    expect(addition.entries.map(item => item.question.taskId)).toEqual(['add-1'])
    expect(subtraction.revisionOk && addition.revisionOk).toBe(true)
    expect(resultTargets(material, { investigationRevision: 'other' }, entries).every(target => !target.revisionOk)).toBe(true)
  })

  it('keeps a single suspicion on all answers as before', () => {
    const material = { investigation: { modelId: 'carry_forget', revision: 'x' } }
    const [target] = resultTargets(material, { investigationRevision: 'x' }, [entry('a', 1), entry('b', 2)])
    expect(target.entries).toHaveLength(2)
    expect(target.revisionOk).toBe(true)
  })
})
