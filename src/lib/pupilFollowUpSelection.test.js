import { describe, expect, it } from 'vitest'
import { pupilFollowUpSelection, followUpRecommendation } from './pupilFollowUpSelection.js'
import { predictableCandidates } from '../domains/predictableErrors/index.js'
import { questionFingerprint } from '../domains/predictableErrors/questionFingerprint.js'
import { evidenceProblem } from './evidenceProblem.js'

const entry = (a, b, operation = 'subtraction') => ({ source: 'screening', question: { operation, operands: [a, b] } })
describe('shared teacher follow-up selection', () => {
  it('keeps the recommendation and draft identical for the same evidence and excludes extra history', () => {
    const support = entry(402, 178)
    const plan = pupilFollowUpSelection({ modelId: 'smaller_minus_larger', supports: [support], entries: [support] })
    expect(plan.status).toBe('proposed')
    expect(followUpRecommendation(plan)).toContain(plan.items[0].text)
    const first = plan.items[0]
    const extended = pupilFollowUpSelection({ modelId: 'smaller_minus_larger', supports: [support], entries: [support],
      historyKeys: [questionFingerprint(first.problem)] })
    expect(extended.items.map(item => item.taskId)).not.toContain(first.taskId)
    const restored = pupilFollowUpSelection({ modelId: 'smaller_minus_larger', supports: [support], entries: [],
      historyKeys: plan.history.excludedFingerprints })
    expect(restored.items).toEqual(plan.items)
    expect(plan.delivery).toBe('reviewed_bank')
  })
  it('keeps non-arithmetic questions advisory and never selects a target variant that equals correct', () => {
    const support = { source: 'practice', question: { domain: 'fractions', skill: 'fractions', values: { text: '2/5+1/3' } } }
    const plan = pupilFollowUpSelection({ modelId: 'fraction_components_separately', supports: [support], entries: [support] })
    expect(plan.status).toBe('proposed')
    expect(plan.delivery).toBe('teacher_advisory')
    for (const item of plan.items) {
      const result = predictableCandidates(item.problem, item.correct)
      expect(result.matches).toEqual([])
    }
    expect(questionFingerprint(evidenceProblem(support))).toBeTruthy()
  })
  it('does not turn input signals or speed practice into automatic probes', () => {
    expect(pupilFollowUpSelection({ modelId: 'notebook_answer_mismatch', supports: [entry(402, 178)], entries: [] })).toBeNull()
    expect(pupilFollowUpSelection({ modelId: 'carry_forget', supports: [], entries: [] })).toBeNull()
  })
})
