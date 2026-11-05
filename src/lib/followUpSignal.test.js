import { describe, expect, it } from 'vitest'
import { followUpSignal } from './followUpSignal.js'

const entry = (status, ...models) => ({ answer: { status }, interpretation: { predictable: { matches: models.map(modelId => ({ modelId })) } } })

describe('follow-up observations without a frozen investigation plan', () => {
  it('retains both rivals instead of selecting the first as the suspected cause', () => {
    const value = followUpSignal([entry('incorrect', 'smaller_minus_larger', 'exchange_not_decremented'),
      entry('incorrect', 'smaller_minus_larger', 'exchange_not_decremented')])
    expect(value.kind).toBe('observations')
    expect(value.models).toEqual([{ modelId: 'exchange_not_decremented', count: 2 }, { modelId: 'smaller_minus_larger', count: 2 }])
  })
  it('does not reject a suspicion from one correct and one unanswered question', () => {
    expect(followUpSignal([entry('correct'), entry('unanswered')])).toMatchObject({ kind: 'observations', total: 1, correct: 1, models: [] })
  })
  it('does not claim independent understanding from completed correct answers', () => {
    expect(followUpSignal([entry('correct'), entry('correct')])).toMatchObject({ kind: 'observations', total: 2, correct: 2, models: [] })
  })
  it('deduplicates a model per answer and excludes input slips and unassessed work', () => {
    const value = followUpSignal([entry('incorrect', 'carry_forget', 'carry_forget', 'notebook_answer_mismatch'), entry('unassessed', 'carry_forget')])
    expect(value.models).toEqual([{ modelId: 'carry_forget', count: 1 }])
    expect(value.total).toBe(1)
  })
})
