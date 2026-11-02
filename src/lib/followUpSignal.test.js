import { describe, expect, it } from 'vitest'
import { followUpSignal } from './followUpSignal.js'

const entry = (status, ...models) => ({ answer: { status }, interpretation: { predictable: { matches: models.map(modelId => ({ modelId })) } } })

describe('directed follow-up signal', () => {
  it('supports the suspicion when the same explanation fits at least two answers', () => {
    expect(followUpSignal([entry('incorrect', 'smaller_minus_larger'), entry('incorrect', 'smaller_minus_larger', 'exchange_not_decremented'), entry('correct')]))
      .toEqual({ kind: 'supports', modelId: 'smaller_minus_larger', count: 2, total: 3 })
  })
  it('speaks against the suspicion when every answer is correct', () => {
    expect(followUpSignal([entry('correct'), entry('correct')])).toEqual({ kind: 'against', total: 2 })
  })
  it('stays unclear for one match or input slips only', () => {
    expect(followUpSignal([entry('incorrect', 'smaller_minus_larger'), entry('incorrect')]).kind).toBe('unclear')
    expect(followUpSignal([entry('incorrect', 'notebook_answer_mismatch'), entry('incorrect', 'notebook_answer_mismatch')]).kind).toBe('unclear')
  })
})
