import { describe, expect, it, vi } from 'vitest'
import { savePendingDiagnosticEvents } from './diagnosticStudentSave.js'

const events = Array.from({ length: 23 }, (_, index) => ({ eventId: `A:${index + 1}` }))

describe('diagnostic pupil save', () => {
  it('sends pending events in order and acknowledges only confirmed batches', async () => {
    const acked = []
    const append = vi.fn(async (_id, revision, batch) => ({ ok: true, serverRevision: revision + 1,
      ack: batch.map(item => item.eventId) }))
    const result = await savePendingDiagnosticEvents({ attemptId: 'A', events, savedSequence: 0,
      revision: 0, append, onAck: value => acked.push(value) })
    expect(append).toHaveBeenCalledTimes(2)
    expect(append.mock.calls[0][2]).toHaveLength(20)
    expect(append.mock.calls[1][1]).toBe(1)
    expect(acked).toEqual([{ sequence: 20, revision: 1 }, { sequence: 23, revision: 2 }])
    expect(result).toEqual({ sequence: 23, revision: 2 })
  })

  it('keeps the unconfirmed remainder pending after failure', async () => {
    const acked = []
    const append = vi.fn().mockImplementationOnce(async (_id, revision, batch) => ({ ok: true,
      serverRevision: revision + 1, ack: batch.map(item => item.eventId) }))
      .mockResolvedValueOnce({ ok: false, error: 'Konflikt' })
    await expect(savePendingDiagnosticEvents({ attemptId: 'A', events, savedSequence: 0,
      revision: 0, append, onAck: value => acked.push(value) })).rejects.toThrow('Konflikt')
    expect(acked).toEqual([{ sequence: 20, revision: 1 }])
  })

  it('rejects a success response without exact acknowledgement', async () => {
    await expect(savePendingDiagnosticEvents({ attemptId: 'A', events: events.slice(0, 1),
      savedSequence: 0, revision: 0, append: async () => ({ ok: true, serverRevision: 1, ack: [] }) }))
      .rejects.toThrow('Servern bekräftade inte alla ändringar.')
  })
})
