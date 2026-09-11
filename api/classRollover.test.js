import { describe, expect, it, vi } from 'vitest'
import { applyRolloverAtomically, buildRolloverPlan, prepareRolloverUpdates } from './_classRollover.js'

const classes = [
  { id: 'four', name: '4B', schoolId: 'school', serverRevision: 2 },
  { id: 'six', name: 'Åk 6A', schoolId: 'school', serverRevision: 4 },
  { id: 'manual', name: 'Stödgrupp', schoolId: 'school', serverRevision: 1 }
]

describe('class rollover', () => {
  it('suggests grade promotion and graduation archive while preserving IDs', () => {
    expect(buildRolloverPlan(classes, { graduatingGrade: 6, exitYear: 2026 })).toMatchObject({
      changes: [
        { id: 'four', from: '4B', action: 'rename', to: '5B' },
        { id: 'six', from: 'Åk 6A', action: 'archive', to: 'Åk 6A 2026 legacy' }
      ],
      snapshot: { four: 2, six: 4, manual: 1 }
    })
  })

  it('rejects a proposed active-name collision before writing', () => {
    expect(() => prepareRolloverUpdates(classes, [
      { id: 'four', action: 'rename', to: 'Stödgrupp' }
    ])).toThrow(/två aktiva klasser/i)
  })

  it('uses one compare-and-set operation and reports stale previews', async () => {
    const store = { eval: vi.fn(async () => -1) }
    await expect(applyRolloverAtomically('school', classes, [
      { id: 'four', action: 'rename', to: '5B' }
    ], { four: 2, six: 4, manual: 1 }, { store })).rejects.toMatchObject({ status: 409 })
    expect(store.eval).toHaveBeenCalledTimes(1)
  })
})
