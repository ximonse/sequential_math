import { describe, expect, it } from 'vitest'
import manifest from '../arithmetic/diagnosticTasks.v1.json'
import { buildContrastSet, rivalModels } from './contrast.js'
import { predictableCandidates } from './index.js'
import { questionFingerprint } from './probes.js'

const sub = (a, b) => ({ domain: 'arithmetic', type: 'subtraction', skill: 'subtraction', values: { a, b } })
const predicted = (problem, id) => predictableCandidates(problem, '').predictions.find(p => p.modelId === id)?.predictedAnswer

describe('exchange-not-decremented model (rule engine only)', () => {
  it('coincides with smaller-minus-larger exactly when the exchanged digits differ by 5', () => {
    expect(predicted(sub(642, 217), 'exchange_not_decremented')).toBe(435)
    expect(predicted(sub(642, 217), 'smaller_minus_larger')).toBe(435)
    expect(predicted(sub(81, 46), 'exchange_not_decremented')).toBe(predicted(sub(81, 46), 'smaller_minus_larger'))
    expect(predicted(sub(47, 29), 'exchange_not_decremented')).toBe(28)
    expect(predicted(sub(47, 29), 'smaller_minus_larger')).toBe(22)
  })
})

describe('directed follow-up contrast questions', () => {
  const supports = [sub(52, 38), sub(63, 27), sub(81, 46)]

  it('tests the suspicion against rivals the pupil answers cannot separate', () => {
    expect(rivalModels('smaller_minus_larger', supports)).toEqual(['exchange_not_decremented', 'borrow_forget'])
  })

  it('separates every explanation with same-structure bank tasks and repeats the observation', () => {
    const set = buildContrastSet({ modelId: 'smaller_minus_larger', supportProblems: supports, bankTasks: manifest.tasks })
    expect(set.status).toBe('proposed')
    expect(set.unresolved).toEqual([])
    expect(set.items.map(i => i.taskId)).toEqual(['sub-exchange-003', 'sub-exchange-004'])
    expect(set.items[0]).toMatchObject({ correct: 524, predictions: { smaller_minus_larger: 536, exchange_not_decremented: 534, borrow_forget: 530 } })
    // No exchange through zero when the pupil's own errors had none.
    expect(set.items.some(i => i.taskId.startsWith('sub-through-zero'))).toBe(false)
  })

  it('never reuses a task the pupil has already answered', () => {
    const seen = new Set([questionFingerprint(sub(652, 128))])
    const set = buildContrastSet({ modelId: 'smaller_minus_larger', supportProblems: supports, bankTasks: manifest.tasks, seenFingerprints: seen })
    expect(set.items.map(i => i.taskId)).not.toContain('sub-exchange-003')
    expect(set.items.length).toBeGreaterThanOrEqual(2)
  })

  it('keeps through-zero suspicions on through-zero tasks first', () => {
    const set = buildContrastSet({ modelId: 'smaller_minus_larger', supportProblems: [sub(402, 178)], bankTasks: manifest.tasks })
    expect(set.items[0].taskId).toBe('sub-through-zero-002')
  })

  it('says honestly when the reviewed bank has nothing for a domain', () => {
    const set = buildContrastSet({ modelId: 'fraction_components_separately', bankTasks: manifest.tasks,
      supportProblems: [{ domain: 'fractions', type: 'fractions', skill: 'fractions', values: { text: '2/5 + 1/3' } }] })
    expect(set).toMatchObject({ status: 'unavailable', items: [] })
  })

  it('stays within the question budget', () => {
    const set = buildContrastSet({ modelId: 'smaller_minus_larger', supportProblems: supports, bankTasks: manifest.tasks, maxItems: 1 })
    expect(set.items).toHaveLength(1)
  })
})
