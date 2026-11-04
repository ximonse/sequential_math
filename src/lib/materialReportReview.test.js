import { describe, expect, it } from 'vitest'
import { materialReportReview } from './materialReportReview.js'

const reference = { studentId: 'P', reportId: 'R', hypothesisId: 'H', checkInRevision: 2, reopen: true }
const basis = { studentId: 'P', classId: 'C', snapshotRevision: 'snapshot', from: '2026-11-01', to: '2026-11-04', source: 'screening', supportRefs: ['answer'] }
const state = { studentId: 'P', classId: 'C', reports: [{ id: 'R', version: 1,
  report: { snapshotRevision: 'snapshot', period: { from: basis.from, to: basis.to }, source: 'screening',
    hypotheses: [{ id: 'H', basis: 'rule_candidate', signalCode: 'carry_forget', supportRefs: ['answer'] }] },
  checkIns: [{ revision: 2, goalSv: 'Ask about method', noteSv: 'Review the original',
    decisions: [{ hypothesisId: 'H', decision: 'revised', interpretationSv: 'Could be copying' }] }] }] }

describe('reviewed report handoff', () => {
  it('preserves the latest teacher interpretation and explicit reopening', () => {
    expect(materialReportReview(reference, state, [{ basis }], 'carry_forget')).toMatchObject({
      reportId: 'R', checkInRevision: 2, decision: 'revised', interpretationSv: 'Could be copying', reopen: true })
  })
  it('refuses silent reopening, stale reviews and unrelated evidence or target', () => {
    for (const change of [{ reopen: false }, { checkInRevision: 1 }, { studentId: 'other' }, { forged: true }]) {
      expect(() => materialReportReview({ ...reference, ...change }, state, [{ basis }], 'carry_forget')).toThrow()
    }
    expect(() => materialReportReview(reference, state, [{ basis: { ...basis, supportRefs: ['other'] } }], 'carry_forget')).toThrow()
    expect(() => materialReportReview(reference, state, [{ basis }], 'borrow_forget')).toThrow()
    const rejected = structuredClone(state)
    rejected.reports[0].checkIns[0].decisions[0].decision = 'rejected'
    expect(() => materialReportReview({ ...reference, reopen: false }, rejected, [{ basis }], 'carry_forget')).toThrow()
  })
})
