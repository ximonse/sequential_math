import { describe, expect, it } from 'vitest'
import { attentionCoordinates, buildAttentionGroup, loadAttentionGroup } from './attentionGroup'

const now = 1800000000000
const pass = (id, changes = {}) => ({ id, version: 1, mode: 'choose', startedAt: now - 120000, finishedAt: now,
  activeMs: 120000, aborted: false, summary: { hits: 3, misses: 1, wrong: 1, withheld: 1, early: 3, median: 300 }, ...changes })

describe('attention group comparisons', () => {
  it('keeps every pupil, separates failed reads and missing data, and pools denominators per pupil', () => {
    const rows = buildAttentionGroup([{ studentId: 'A', name: 'Alva' }, { studentId: 'B', name: 'Bo' }, { studentId: 'C', name: 'Cia' }], {
      A: { status: 'ready', history: [pass('a'), pass('b', { summary: { hits: 1, misses: 9, wrong: 0, withheld: 1, early: 1, median: 500 } }), pass('c', { aborted: true })] },
      B: { status: 'error' }, C: { status: 'ready', history: [] }
    }, { now })
    expect(rows).toHaveLength(3)
    expect(rows[0].groups.choose.go).toEqual({ correct: 4, total: 14, percent: 100 * 4 / 14 })
    expect(rows[0].groups.choose.aborted).toBe(1)
    expect(rows[1].status).toBe('error')
    expect(rows[2].status).toBe('ready')
    expect(attentionCoordinates(rows[0], 'choose')).toMatchObject({ x: 100 * 4 / 14, y: 100 * 2 / 3 })
    expect(attentionCoordinates(rows[2], 'choose')).toBeNull()
  })
  it('applies period independently to each pupil, preserves zero and excludes aborted-only plot points', () => {
    const rows = buildAttentionGroup([{ studentId: 'A' }], { A: { status: 'ready', history: [
      pass('old', { startedAt: now - 10 * 86400000, finishedAt: now - 9 * 86400000 }),
      pass('zero', { summary: { hits: 0, misses: 2, wrong: 2, withheld: 0, early: 0, median: null } })
    ] } }, { now, days: '7' })
    expect(rows[0].history).toHaveLength(1)
    expect(attentionCoordinates(rows[0], 'choose')).toMatchObject({ x: 0, y: 0 })
    const aborted = buildAttentionGroup([{ studentId: 'A' }], { A: { status: 'ready', history: [pass('abort', { aborted: true })] } })
    expect(attentionCoordinates(aborted[0], 'choose')).toBeNull()
  })
  it('never copies math data, limits concurrent reads and rejects mismatched profiles', async () => {
    let active = 0, maximum = 0
    const records = {}
    await loadAttentionGroup(Array.from({ length: 9 }, (_, i) => ({ studentId: `${i}` })), async id => {
      maximum = Math.max(maximum, ++active)
      await new Promise(resolve => setTimeout(resolve, 1))
      active--
      return { studentId: id === '0' ? 'OTHER' : id, attentionHistory: [pass(id)], problemLog: ['private math'] }
    }, (id, record) => { records[id] = record })
    expect(maximum).toBe(4)
    expect(Object.keys(records)).toHaveLength(9)
    expect(records['0']).toEqual({ status: 'error' })
    expect(records['1']).toEqual({ status: 'ready', history: [pass('1')] })
  })
  it('discards late reads after leaving a group and stops scheduling further pupils', async () => {
    let active = true, calls = 0, writes = 0
    await loadAttentionGroup(Array.from({ length: 10 }, (_, i) => ({ studentId: `${i}` })), async id => {
      calls++; active = false
      return { studentId: id }
    }, () => writes++, () => active)
    expect(calls).toBe(1)
    expect(writes).toBe(0)
  })
})
