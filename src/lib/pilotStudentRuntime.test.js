import { describe, expect, it, vi } from 'vitest'
import { createPilotStudentRuntime } from './pilotStudentRuntime'

const studentId = 'A'.repeat(32)
const profile = { studentId, currentDifficulty: 3, highestDifficulty: 4,
  adaptive: { skillStates: {} }, stats: { totalProblems: 2 }, recentProblems: [], problemLog: [] }

function vault() {
  return {
    saveSnapshot: vi.fn(async () => {}),
    saveSnapshotAndAppendEvent: vi.fn(async () => {}),
    listPendingEvents: vi.fn(async () => []),
    acknowledgeEvents: vi.fn(async () => {}),
    close: vi.fn()
  }
}

describe('pilot student runtime', () => {
  it('binds bootstrap to the resumed cookie identity and saves the server profile encrypted', async () => {
    const store = vault()
    const runtime = createPilotStudentRuntime({
      createStore: vi.fn(async () => store),
      resumeSession: vi.fn(async () => ({ ok: true, student: { studentId } })),
      fetchProfile: vi.fn(async () => ({ ok: true, profile })),
      postEvents: vi.fn(), makeEventId: () => 'event-1'
    })
    await expect(runtime.bootstrap(studentId)).resolves.toMatchObject({ ok: true, profile })
    expect(store.saveSnapshot).toHaveBeenCalledWith(profile)
  })

  it('refuses a route whose ID does not match the cookie session', async () => {
    const runtime = createPilotStudentRuntime({ resumeSession: vi.fn(async () => ({ ok: true, student: { studentId } })) })
    await expect(runtime.bootstrap('B'.repeat(32))).resolves.toMatchObject({ ok: false, error: expect.stringContaining('stämmer inte') })
  })

  it('writes a snapshot and event atomically before syncing only acknowledged event IDs', async () => {
    const store = vault()
    const postEvents = vi.fn(async entries => ({ ok: true, ack: entries.map(entry => entry.id) }))
    const runtime = createPilotStudentRuntime({
      createStore: vi.fn(async () => store), resumeSession: vi.fn(async () => ({ ok: true, student: { studentId } })),
      fetchProfile: vi.fn(async () => ({ ok: true, profile })), postEvents, makeEventId: () => 'checkpoint-1'
    })
    await runtime.bootstrap(studentId)
    await expect(runtime.persistCheckpoint(profile)).resolves.toEqual({ ok: true })
    expect(store.saveSnapshotAndAppendEvent).toHaveBeenCalledWith(expect.objectContaining({ snapshot: profile,
      event: expect.objectContaining({ id: 'checkpoint-1', type: 'profile_checkpoint', payload: expect.not.objectContaining({ studentId }) }) }))
    expect(runtime.getSyncStatus()).toMatchObject({ state: 'synced', pendingCount: 0, lastError: '' })
  })

  it('reports locally saved work as pending when the server is unavailable', async () => {
    const pendingEvent = { event: { id: 'event-pending' } }
    const store = vault()
    store.listPendingEvents
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingEvent])
    const runtime = createPilotStudentRuntime({
      createStore: vi.fn(async () => store), resumeSession: vi.fn(async () => ({ ok: true, student: { studentId } })),
      fetchProfile: vi.fn(async () => ({ ok: true, profile })),
      postEvents: vi.fn(async () => ({ ok: false, error: 'Ingen anslutning' })),
      makeEventId: () => 'checkpoint-2'
    })
    await runtime.bootstrap(studentId)
    await expect(runtime.persistCheckpoint(profile)).resolves.toMatchObject({ ok: false })
    expect(runtime.getSyncStatus()).toMatchObject({
      state: 'pending',
      pendingCount: 1,
      lastError: 'Ingen anslutning'
    })
  })
})
