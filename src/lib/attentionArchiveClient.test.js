import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('./teacherAuth', () => ({ getTeacherApiToken: () => 'test-token' }))
import { loadAttentionArchive } from './attentionArchiveClient'
const pass = id => ({ id, version: 1, mode: 'discover', startedAt: 1000, finishedAt: 5000,
  activeMs: 4000, aborted: true, summary: { hits: 1, misses: 0, wrong: 0, withheld: 0, early: 0, median: 200 } })
afterEach(() => vi.unstubAllGlobals())
describe('complete attention archive loading', () => {
  it('loads all 610 records through a frozen manifest even when another pass arrives, with bounded read requests', async () => {
    const manifest = Array.from({ length: 610 }, (_, i) => `pass-${String(i).padStart(4, '0')}`)
    const fetch = vi.fn(async url => {
      const query = new URL(url, 'http://localhost').searchParams
      const ids = query.get('ids')?.split(',') || manifest.slice(0, 100)
      expect(ids.length).toBeLessThanOrEqual(query.has('ids') ? 50 : 100)
      return { ok: true, json: async () => ({ studentId: 'PUPIL', asOf: 10000,
        records: ids.map(id => ({ result: pass(id), final: true })),
        ...(query.has('ids') ? {} : { manifest, next: manifest[99] }) }) }
    })
    vi.stubGlobal('fetch', fetch)
    const loaded = await loadAttentionArchive('PUPIL')
    expect(loaded.attentionHistory).toHaveLength(610)
    expect(new Set(loaded.attentionHistory.map(result => result.id)).size).toBe(610)
    expect(fetch).toHaveBeenCalledTimes(12)
  })
  it('rejects missing, malformed and failed pages instead of producing a partial export', async () => {
    for (const response of [
      { ok: false },
      { ok: true, json: async () => ({ studentId: 'PUPIL', asOf: 1, manifest: ['missing'], records: [], next: null }) },
      { ok: true, json: async () => ({ studentId: 'PUPIL', asOf: 1, manifest: ['bad'], records: [{ result: { id: 'bad' } }], next: null }) }
    ]) {
      vi.stubGlobal('fetch', vi.fn(async () => response))
      await expect(loadAttentionArchive('PUPIL')).rejects.toThrow()
    }
  })
})
