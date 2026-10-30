import { describe, expect, it } from 'vitest'
import { decidePilot } from './ncm-screening-pilot.mjs'
import { cases, response, reviewedHistory } from './ncm-screening-pilot.fixtures.mjs'

const signature = decision => `${decision.action}:${decision.task?.id || decision.outcome || decision.reasonCode}`

describe('offline NCM decision pilot', () => {
  for (const fixture of cases) it(fixture.title, () => {
    const responses = [], steps = []
    let result = decidePilot({ ...fixture, responses })
    steps.push(signature(result))
    for (const answer of fixture.answers) {
      expect(result.action).toBe('ask')
      expect(result.task.id).toBe(answer.taskId)
      responses.push(answer)
      result = decidePilot({ ...fixture, responses })
      steps.push(signature(result))
      expect(result.usedNewQuestions).toBeLessThanOrEqual(5)
      expect(result.evidenceClass).toBe('diagnostic_only')
    }
    expect(steps).toEqual(fixture.expected)
  })

  it('does not count a repeated observation or repeated question as independent support', () => {
    const h = reviewedHistory('sub-exchange-001', 425)
    const state = { history: [h, { ...h }], responses: [response('sub-exchange-001', 425)] }
    const result = decidePilot(state)
    expect(result.action).toBe('ask')
    expect(result.task.id).toBe('sub-exchange-002')
    expect(result.supportIds).toHaveLength(1)
    expect(result.evidenceIds).toHaveLength(2)
  })

  it('stops on conflicting versions of the same observation', () => {
    const h = reviewedHistory('sub-exchange-001', 425)
    expect(decidePilot({ history: [h, { ...h, answer: 435 }] }).reasonCode).toBe('conflicting_observation')
  })

  it('does not transfer a successful single exchange to exchange through zero', () => {
    const result = decidePilot({ scope: 'through_zero', history: [reviewedHistory('sub-exchange-001', 425)] })
    expect(result.supportIds).toEqual([])
    expect(result.ignored[0].reason).toBe('different_subskill')
    expect(result.task.role).toBe('baseline')
  })

  it('requires explicit justification before using history and does not repeat a seen task', () => {
    const result = decidePilot({ history: [reviewedHistory('sub-exchange-001', 425, { selectionReason: '' })],
      responses: [response('sub-no-exchange-001', 533)] })
    expect(result.supportIds).toEqual([])
    expect(result.ignored[0].reason).toBe('history_not_reviewed_for_scope')
    expect(result.task.id).toBe('sub-exchange-002')
  })

  it('does not route differently when arbitrary legacy error labels change', () => {
    const first = response('sub-exchange-001', 435)
    const state = { responses: [response('sub-no-exchange-001', 533), first] }
    const withLabels = { ...state, responses: [state.responses[0], { ...first, patterns: ['place_value_error', 'invented_diagnosis'] }] }
    expect(decidePilot(withLabels)).toEqual(decidePilot(state))
  })

  it('does not discard an unresolved historical counterexample', () => {
    const result = decidePilot({ history: [reviewedHistory('sub-exchange-001', 435)], responses: [
      response('sub-exchange-001', 425), response('sub-exchange-002', 325)
    ] })
    expect(result.outcome).not.toBe('supported')
    expect(result.task.role).toBe('prerequisite')
  })

  it('honours the five-question boundary without turning uncertainty into failure or mastery', () => {
    const responses = [response('sub-no-exchange-001', 533), response('sub-no-exchange-002', 534),
      response('sub-exchange-001', 435), response('pilot-ag3-a', 5), response('pilot-ag3-b', 8)]
    expect(decidePilot({ responses })).toMatchObject({ action: 'stop', outcome: 'insufficient', reasonCode: 'question_budget', usedNewQuestions: 5 })
  })

  it('never bypasses an older pending save, even after a subsequent response', () => {
    const result = decidePilot({ responses: [response('sub-no-exchange-001', 533, { saved: false }), response('sub-exchange-001', 425)] })
    expect(result).toMatchObject({ action: 'wait', reasonCode: 'save_pending' })
  })

  it('keeps invalid input separate from mathematical errors', () => {
    expect(decidePilot({ responses: [response('sub-exchange-001', 'abc')] })).toMatchObject({
      action: 'stop', outcome: 'insufficient', reasonCode: 'uninterpretable_response'
    })
  })

  it('stops rather than generating an unreviewed replacement when the contrast pool is exhausted', () => {
    const result = decidePilot({ history: [reviewedHistory('sub-exchange-001', 425), reviewedHistory('sub-exchange-002', 325)] })
    expect(result).toMatchObject({ action: 'stop', outcome: 'insufficient', reasonCode: 'no_unseen_contrast' })
  })

  it('does not infer blank or zero input as a correct numeric answer', () => {
    expect(decidePilot({ responses: [response('pilot-ag3-a', '')] }).reasonCode).toBe('uninterpretable_response')
    expect(decidePilot({ responses: [response('pilot-ag3-a', 0)] }).outcome).not.toBe('supported')
  })

  it('leaves the caller data unchanged and rejects a missing explicit method-review state', () => {
    const input = { history: [reviewedHistory('sub-exchange-001', 425)], responses: [] }
    const before = JSON.stringify(input)
    decidePilot(input)
    expect(JSON.stringify(input)).toBe(before)
    expect(() => decidePilot({ responses: [response('sub-exchange-001', 425, { method: undefined })] })).toThrow()
  })
})
