import { describe, it, expect, vi } from 'vitest'
import { buildBatches, compactCheckpointEvent, createPilotStudentRuntime } from './pilotStudentRuntime'
import { validEntry } from '../../api/student/[studentId]/events.js'

// Events queued before a validation fix stay invalid forever. Without a guard
// they block every later result from ever reaching the server.
function makeStore(events, initialRejected = []) {
  const acknowledged = []
  const rejected = [...initialRejected]
  const superseded = []
  return {
    acknowledged,
    rejected,
    superseded,
    listPendingEvents: vi.fn(async () => events.filter(event => !acknowledged.includes(event.id) && !rejected.includes(event.id)).map(event => ({ event }))),
    listRejectedEvents: vi.fn(async () => events.filter(event => rejected.includes(event.id) && !acknowledged.includes(event.id) && !superseded.includes(event.id)).map(event => ({ event }))),
    countRejectedEvents: vi.fn(async () => rejected.filter(id => !acknowledged.includes(id) && !superseded.includes(id)).length),
    rejectEvents: vi.fn(async ids => { rejected.push(...ids) }),
    supersedeRejectedEvents: vi.fn(async ids => { superseded.push(...ids) }),
    acknowledgeEvents: vi.fn(async ids => { acknowledged.push(...ids) }),
    saveSnapshot: vi.fn(),
    saveSnapshotAndAppendEvent: vi.fn(),
    close: vi.fn()
  }
}

async function runSync(store, postEvents) {
  const runtime = createPilotStudentRuntime({
    createStore: async () => store,
    resumeSession: async () => ({ ok: true, student: { studentId: 'A'.repeat(32) } }),
    fetchProfile: async () => ({ ok: true, profile: { studentId: 'A'.repeat(32) } }),
    postEvents
  })
  return runtime.bootstrap('A'.repeat(32))
}

describe('synk med ogiltiga händelser i kön', () => {
  it('bevarar den avvisade händelsen och skickar de giltiga', async () => {
    const store = makeStore([
      { id: 'bad', type: 'problem_result', payload: {} },
      { id: 'good', type: 'problem_result', payload: { problemId: 'p1' } }
    ])
    const postEvents = vi.fn(async entries => {
      if (entries.some(entry => entry.id === 'bad')) return { ok: false, status: 400, error: 'Invalid event batch' }
      return { ok: true, ack: entries.map(entry => entry.id) }
    })

    const result = await runSync(store, postEvents)

    expect(result.ok).toBe(true)
    expect(result.rejectedCount).toBe(1)
    expect(store.acknowledged).toContain('good')
    expect(store.acknowledged).not.toContain('bad')
    expect(store.rejected).toEqual(['bad'])
  })

  it('behåller kön vid nätverksfel', async () => {
    const store = makeStore([{ id: 'a', type: 'problem_result', payload: { problemId: 'p1' } }])
    const postEvents = vi.fn(async () => ({ ok: false, error: 'Kunde inte nå tjänsten.' }))

    const result = await runSync(store, postEvents)

    expect(result.ok).toBe(false)
    expect(store.acknowledged).toEqual([])
  })
})

describe('batchstorlek', () => {
  it('håller ett växande checkpoint under serverns gräns utan att ändra lokalt original', () => {
    const events = Array.from({ length: 200 }, (_, index) => ({ ts: index + 1, type: 'practice_answer', payload: { sessionId: 'test', correct: true, operation: 'addition', skillTag: 'add_1d_1d', speedTimeSec: 3, trainingMode: 'mixed', trainingSource: 'free' } }))
    const event = { id: 'checkpoint_1', type: 'profile_checkpoint', studentId: 'A'.repeat(32), timestamp: Date.now(), payload: { capturedAt: Date.now(), currentDifficulty: 1, highestDifficulty: 1, telemetry: { events, daily: { '2026-09-25': { practice_answers: 200 } } } } }
    expect(validEntry(event, event.studentId)).toBe(false)
    const compacted = compactCheckpointEvent(event)
    expect(validEntry(compacted, event.studentId)).toBe(true)
    expect(compacted.payload.telemetry.daily).toEqual(event.payload.telemetry.daily)
    expect(compacted.payload.telemetry.events.length).toBeLessThan(events.length)
    expect(event.payload.telemetry.events).toHaveLength(200)
  })

  it('återhämtar senaste avvisade checkpointen utan att göra nya inloggningen långsam', async () => {
    const id = 'A'.repeat(32)
    const makeCheckpoint = (eventId, capturedAt) => ({ id: eventId, type: 'profile_checkpoint', studentId: id, timestamp: capturedAt, payload: { capturedAt, currentDifficulty: 1, telemetry: { events: Array.from({ length: 200 }, (_, index) => ({ ts: index + 1, type: 'practice_answer', payload: { operation: 'addition', skillTag: 'add_1d_1d', trainingMode: 'mixed' } })), daily: { '2026-09-25': { practice_answers: 200 } } } } })
    const store = makeStore([makeCheckpoint('old', 1), makeCheckpoint('latest', 2)], ['old', 'latest'])
    const postEvents = vi.fn(async entries => ({ ok: true, ack: entries.map(entry => entry.id) }))
    const result = await runSync(store, postEvents)
    expect(result).toMatchObject({ ok: true, rejectedCount: 0 })
    expect(postEvents).toHaveBeenCalledTimes(1)
    expect(postEvents.mock.calls[0][0]).toHaveLength(1)
    expect(postEvents.mock.calls[0][0][0].id).toBe('latest')
    expect(store.acknowledged).toEqual(['latest'])
    expect(store.superseded).toEqual(['old'])
  })

  it('försöker inte skicka samma avvisade checkpoint igen vid varje sidbyte', async () => {
    const id = 'A'.repeat(32)
    const event = { id: 'rejected_checkpoint', type: 'profile_checkpoint', studentId: id, timestamp: 1, payload: { capturedAt: 1, currentDifficulty: 1 } }
    const store = makeStore([event], [event.id])
    const postEvents = vi.fn(async () => ({ ok: false, status: 400 }))
    const runtime = createPilotStudentRuntime({
      createStore: async () => store,
      resumeSession: async () => ({ ok: true, student: { studentId: id } }),
      fetchProfile: async () => ({ ok: true, profile: { studentId: id } }),
      postEvents
    })
    await runtime.bootstrap(id)
    await runtime.bootstrap(id)
    expect(postEvents).toHaveBeenCalledTimes(1)
    expect(store.acknowledged).toEqual([])
  })

  it('delar på byte-gränsen, inte bara på antal', () => {
    const big = { id: 'x', type: 'profile_checkpoint', payload: { blob: 'a'.repeat(100 * 1024) } }
    const batches = buildBatches([big, { ...big, id: 'y' }, { ...big, id: 'z' }])
    expect(batches.length).toBeGreaterThan(1)
    expect(batches.every(batch => batch.length <= 100)).toBe(true)
  })

  it('bevarar en händelse som är för stor för servern', async () => {
    const store = makeStore([{ id: 'huge', type: 'problem_result', payload: { problemId: 'p1' } }])
    const postEvents = vi.fn(async () => ({ ok: false, status: 413, error: 'Event batch too large' }))

    const result = await runSync(store, postEvents)

    expect(result.ok).toBe(true)
    expect(result.rejectedCount).toBe(1)
    expect(store.acknowledged).toEqual([])
    expect(store.rejected).toEqual(['huge'])
  })

  it('kräver kvittens även när enskild sändning svarar ok', async () => {
    const store = makeStore([{ id: 'bad' }, { id: 'good' }])
    const postEvents = vi.fn(async entries => entries.length > 1
      ? { ok: false, status: 400 }
      : { ok: true, ack: [] })
    const result = await runSync(store, postEvents)
    expect(result.ok).toBe(false)
    expect(store.acknowledged).toEqual([])
    expect(store.rejected).toEqual([])
  })
})
