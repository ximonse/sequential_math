import { describe, expect, it, vi } from 'vitest'
import { createPilotStudentRuntime } from './pilotStudentRuntime'
const focusResult = () => ({ id: 'pass-1', version: 1, mode: 'choose', startedAt: 1000, finishedAt: 21000,
  activeMs: 20000, aborted: true, summary: { hits: 1, misses: 1, wrong: 0, withheld: 1, early: 0, median: 350 } })

const studentId = 'A'.repeat(32)
const profile = { studentId, currentDifficulty: 3, highestDifficulty: 4,
  adaptive: { skillStates: {} }, stats: { totalProblems: 2 }, recentProblems: [], problemLog: [] }

function vault() {
  return {
    saveSnapshot: vi.fn(async () => {}),
    saveSnapshotAndAppendEvent: vi.fn(async () => {}),
    listPendingEvents: vi.fn(async () => []),
    countRejectedEvents: vi.fn(async () => 0),
    listRejectedEvents: vi.fn(async () => []),
    rejectEvents: vi.fn(async () => {}),
    supersedeRejectedEvents: vi.fn(async () => {}),
    acknowledgeEvents: vi.fn(async () => {}),
    saveDiagnosticDraft: vi.fn(async () => {}),
    readDiagnosticDraft: vi.fn(async () => null),
    clearDiagnosticDraftIfConfirmed: vi.fn(async () => true),
    close: vi.fn()
  }
}

describe('pilot student runtime', () => {
  it('persists an attention pass locally, retries the same queued event and refuses another pupil', async () => {
    const store = vault()
    let saved = false, acknowledged = false
    store.readSnapshot = vi.fn(async () => structuredClone(profile))
    store.readEventState = vi.fn(async () => saved ? { acknowledged, rejected: false } : null)
    store.saveSnapshotAndAppendEvent.mockImplementation(async () => { saved = true })
    store.listPendingEvents.mockImplementation(async () => saved && !acknowledged ? [{ event: { id: 'attention_pass-1', type: 'attention_result', payload: focusResult() } }] : [])
    store.acknowledgeEvents.mockImplementation(async () => { acknowledged = true })
    const postEvents = vi.fn(async () => ({ ok: false, error: 'Offline' }))
    const runtime = createPilotStudentRuntime({ createStore: async () => store, resumeSession: async () => ({ ok: true, student: { studentId } }), fetchProfile: async () => ({ ok: true, profile }), postEvents })
    await runtime.bootstrap(studentId)
    await expect(runtime.persistAttentionResult('OTHER', focusResult())).resolves.toMatchObject({ ok: false, locallySaved: false })
    const onLocalSaved = vi.fn(() => { expect(store.saveSnapshotAndAppendEvent).toHaveBeenCalledTimes(1) })
    await expect(runtime.persistAttentionResult(studentId, focusResult(), { onLocalSaved })).resolves.toMatchObject({ ok: false, locallySaved: true })
    expect(onLocalSaved).toHaveBeenCalledTimes(1)
    expect(store.saveSnapshotAndAppendEvent).toHaveBeenCalledTimes(1)
    postEvents.mockImplementation(async entries => ({ ok: true, ack: entries.map(e => e.id) }))
    await expect(runtime.persistAttentionResult(studentId, focusResult())).resolves.toMatchObject({ ok: true, locallySaved: true })
    expect(store.saveSnapshotAndAppendEvent).toHaveBeenCalledTimes(1)
    await expect(runtime.persistAttentionResult(studentId, focusResult())).resolves.toMatchObject({ ok: true })
    const snapshot = store.saveSnapshotAndAppendEvent.mock.calls[0][0].snapshot
    const { attentionHistory, ...math } = snapshot
    expect(math).toEqual(profile)
    expect(attentionHistory).toHaveLength(1)
    saved = false; acknowledged = false
    store.saveSnapshotAndAppendEvent.mockRejectedValueOnce(new Error('Storage quota exceeded'))
    const sentBefore = postEvents.mock.calls.length
    await expect(runtime.persistAttentionResult(studentId, focusResult())).rejects.toThrow('Storage quota')
    expect(postEvents).toHaveBeenCalledTimes(sentBefore)
  })
  it('deletes a local vault only after the server confirms that the pupil was retired', async () => {
    const deleteStore = vi.fn(async () => {})
    const checkRetired = vi.fn(async () => true)
    const runtime = createPilotStudentRuntime({ resumeSession: async () => ({ ok: false, status: 401 }), checkRetired, deleteStore })
    await runtime.bootstrap(studentId)
    expect(checkRetired).toHaveBeenCalledWith(studentId)
    expect(deleteStore).toHaveBeenCalledWith(studentId)
    deleteStore.mockClear()
    checkRetired.mockResolvedValue(false)
    await runtime.bootstrap(studentId)
    expect(deleteStore).not.toHaveBeenCalled()
  })
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

  it('waits for queued diagnostic writes before clearing a confirmed draft', async () => {
    const store = vault()
    let finishWrite
    store.saveDiagnosticDraft.mockImplementation(() => new Promise(resolve => { finishWrite = resolve }))
    const runtime = createPilotStudentRuntime({
      createStore: vi.fn(async () => store),
      resumeSession: vi.fn(async () => ({ ok: true, student: { studentId } })),
      fetchProfile: vi.fn(async () => ({ ok: true, profile }))
    })
    await runtime.bootstrap(studentId)
    const snapshot = { attemptId: 'attempt-a', events: [{ eventId: 'attempt-a:1' }] }
    const write = runtime.saveDiagnosticDraft(studentId, 'attempt-a', snapshot)
    const clear = runtime.clearConfirmedDiagnosticDraft(studentId, 'attempt-a', snapshot)
    await Promise.resolve()
    expect(store.clearDiagnosticDraftIfConfirmed).not.toHaveBeenCalled()
    finishWrite()
    await Promise.all([write, clear])
    expect(store.clearDiagnosticDraftIfConfirmed).toHaveBeenCalledWith('attempt-a', snapshot)
  })
})
