import { expect, it, vi } from 'vitest'
import { fetchPupilEvidence } from './pupil-evidence-client.mjs'

it('collects all pages using one revision without silently restarting after a conflict', async () => {
  const api = vi.fn().mockResolvedValueOnce({ entries: [{ ref: 'A' }], snapshotRevision: 'REV', nextCursor: 'CURSOR', total: 2 })
    .mockResolvedValueOnce({ entries: [{ ref: 'B' }], snapshotRevision: 'REV', nextCursor: null, total: 2 })
  const result = await fetchPupilEvidence(api, { studentId: 'PUPIL', classId: 'CLASS', from: '2026-10-27', to: '2026-10-27' })
  expect(result.entries).toEqual([{ ref: 'A' }, { ref: 'B' }])
  expect(api.mock.calls[1][0]).toContain('snapshotRevision=REV')
  expect(api.mock.calls[1][0]).toContain('cursor=CURSOR')
  api.mockRejectedValue(new Error('evidence_changed'))
  await expect(fetchPupilEvidence(api, { studentId: 'P', classId: 'C', from: '2026-10-27', to: '2026-10-27' }))
    .rejects.toThrow('evidence_changed')
})

it('rejects truncated exports and repeated cursors instead of reporting a complete result', async () => {
  const args = { studentId: 'P', classId: 'C', from: '2026-10-27', to: '2026-10-27' }
  await expect(fetchPupilEvidence(async () => ({ entries: [], total: 1, snapshotRevision: 'R', nextCursor: null }), args))
    .rejects.toThrow('Ofullständig')
  await expect(fetchPupilEvidence(async () => ({ entries: [], total: 1, snapshotRevision: 'R', nextCursor: 'REPEATED' }), args))
    .rejects.toThrow('upprepade')
})
