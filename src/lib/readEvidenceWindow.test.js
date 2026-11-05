import { describe, expect, it, vi } from 'vitest'
import { readEvidenceWindow } from './readEvidenceWindow.js'
const period = { from: '2026-01-01', to: '2026-01-02' }
const result = (entries, revision = 'R', cursor = null) => ({ ok: true, data: { entries, snapshotRevision: revision, nextCursor: cursor } })
describe('follow-up history completeness', () => {
  it('pins a revision across all pages instead of interpreting only the first page', async () => {
    const request = vi.fn().mockResolvedValueOnce(result([{ ref: 'A' }], 'R', 'next')).mockResolvedValueOnce(result([{ ref: 'B' }]))
    expect((await readEvidenceWindow(request, '/base?classId=C', period, 'all')).entries).toEqual([{ ref: 'A' }, { ref: 'B' }])
    expect(request.mock.calls[1][0]).toContain('snapshotRevision=R')
  })
  it('rejects changed revisions, loops, malformed histories, missing indexed work and denied access', async () => {
    const pages = [
      [result([], 'R', 'next'), result([], 'changed')],
      [result([], 'R', 'next'), result([], 'R', 'next')],
      [{ ok: true, data: { entries: [], nextCursor: null } }],
      [{ ok: true, data: { entries: [], snapshotRevision: 'R', nextCursor: null, coverage: { screening: { invalidRecords: 1 } } } }],
      [{ ok: false, data: { error: 'access revoked' } }],
    ]
    for (const values of pages) {
      let position = 0
      await expect(readEvidenceWindow(async () => values[position++], '/base?classId=C', period, 'all')).rejects.toThrow()
    }
  })
})
