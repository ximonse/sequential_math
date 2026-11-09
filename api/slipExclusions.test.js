import { describe, expect, it } from 'vitest'
import { applySlipExclusions, readSlipExclusions, setSlipExclusion, slipExclusionKey } from './_slipExclusions.js'

const memory = () => { const data = new Map(); return { get: async key => data.get(key) ?? null, set: async (key, value) => { data.set(key, value) } } }
const practice = id => ({ source: 'practice', reference: { kind: 'observation', observationId: id } })

describe('teacher slip exclusions', () => {
  it('gives stable keys only to identifiable answers', () => {
    expect(slipExclusionKey(practice('obs-1'))).toBe('practice:obs-1')
    expect(slipExclusionKey({ source: 'screening', reference: { attemptId: 'att_9' } })).toBe('screening:att_9')
    expect(slipExclusionKey({ source: 'practice', reference: { kind: 'legacy_position', position: 3 } })).toBe(null)
  })

  it('hides and restores an answer without touching the others', async () => {
    const store = memory()
    await setSlipExclusion('P', 'practice:obs-1', true, 'T', { store, now: 5 })
    const { kept, hidden } = applySlipExclusions([practice('obs-1'), practice('obs-2')], await readSlipExclusions('P', { store }))
    expect(hidden).toEqual([{ ...practice('obs-1'), exclusionKey: 'practice:obs-1', excludedAt: 5 }])
    expect(kept).toEqual([practice('obs-2')])
    await setSlipExclusion('P', 'practice:obs-1', false, 'T', { store })
    expect(applySlipExclusions([practice('obs-1')], await readSlipExclusions('P', { store })).hidden).toEqual([])
  })

  it('refuses keys that are not answer references', async () => {
    await expect(setSlipExclusion('P', 'student:abc', true, 'T', { store: memory() })).rejects.toThrow(/Ogiltig/)
  })
})
