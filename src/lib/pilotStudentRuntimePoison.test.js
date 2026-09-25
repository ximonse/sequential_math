import { describe, it, expect, vi } from 'vitest'
import { buildBatches, compactCheckpointEvent, createPilotStudentRuntime } from './pilotStudentRuntime'
import { applyWalEntry, validEntry } from '../../api/student/[studentId]/events.js'
import { addProblemResult, createStudentProfile } from './studentProfile'
import { annotateSelectedProblem } from './difficultyAdapterProfileHelpers'
import { getDomain } from '../domains/registry'

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
  it.each([false, true])('recovers a legacy result without a problem ID (already rejected: %s)', async alreadyRejected => {
    const event = { id: 'legacy-result-123', type: 'problem_result', timestamp: 1000,
      payload: { observationId: 'undefined:1000', timestamp: 1000, correct: false,
        operation: 'fractions', studentAnswer: '1/3', correctAnswer: '1/2' } }
    const store = makeStore([event], alreadyRejected ? [event.id] : [])
    const serverProfile = createStudentProfile('A'.repeat(32), 'Test')
    const postEvents = vi.fn(async entries => {
      if (!entries.every(entry => validEntry(entry, serverProfile.studentId))) return { ok: false, status: 400 }
      entries.forEach(entry => applyWalEntry(serverProfile, entry))
      return { ok: true, ack: entries.map(entry => entry.id) }
    })
    expect(await runSync(store, postEvents)).toMatchObject({ ok: true, rejectedCount: 0 })
    expect(serverProfile.problemLog).toHaveLength(1)
    expect(serverProfile.problemLog[0]).toMatchObject(event.payload)
    expect(store.acknowledged).toEqual([event.id])
    expect(event.payload.problemId).toBeUndefined()
    // Simulate a lost local acknowledgement followed by a fresh browser session.
    expect(await runSync(makeStore([event], [event.id]), postEvents)).toMatchObject({ rejectedCount: 0 })
    expect(serverProfile.problemLog).toHaveLength(1)
  })
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

  it('isolates one bad event in a full batch without 100 sequential requests', async () => {
    const events = Array.from({ length: 100 }, (_, i) => ({ id: `queued-${i}`, type: 'problem_result',
      payload: i === 50 ? {} : { problemId: `problem-${i}`, timestamp: i + 1, correct: true } }))
    const store = makeStore(events)
    const postEvents = vi.fn(async entries => entries.every(event => validEntry(event, 'A'.repeat(32)))
      ? { ok: true, ack: entries.map(event => event.id) }
      : { ok: false, status: 400 })
    expect(await runSync(store, postEvents)).toMatchObject({ ok: true, rejectedCount: 1 })
    expect(store.acknowledged).toHaveLength(99)
    expect(store.rejected).toEqual(['queued-50'])
    expect(postEvents.mock.calls.length).toBeLessThanOrEqual(15)
  })

  it('retains a recoverable legacy answer when no acknowledgement arrives', async () => {
    const event = { id: 'unconfirmed-legacy', type: 'problem_result',
      payload: { timestamp: 1000, correct: true } }
    const store = makeStore([event], [event.id])
    expect(await runSync(store, async () => ({ ok: true, ack: ['someone-else'] })))
      .toMatchObject({ ok: true, rejectedCount: 1 })
    expect(store.acknowledged).toEqual([])
  })
})

describe('batchstorlek', () => {
  it('keeps a full session syncable without overwriting separately persisted need history', () => {
    const profile = createStudentProfile('A'.repeat(32), 'Test')
    const server = structuredClone(profile)
    for (let i = 0; i < 150; i++) {
      const problem = getDomain('arithmetic').generate('addition', 1, {})
      annotateSelectedProblem(profile, problem, { reason: 'normal', bucket: 'core', targetLevel: 1 })
      const { walEntries } = addProblemResult(profile, problem, '999', 3, {})
      walEntries.forEach((entry, j) => applyWalEntry(server, { ...entry, id: `answer-${i}-${j}`, timestamp: i + 1 }))
    }
    const event = { id: 'full-session-checkpoint', type: 'profile_checkpoint', timestamp: Date.now(),
      payload: { capturedAt: Date.now(), adaptive: profile.adaptive, stats: profile.stats } }
    expect(validEntry(event, profile.studentId)).toBe(false)
    const compacted = compactCheckpointEvent(event)
    expect(validEntry(compacted, profile.studentId)).toBe(true)
    const needs = structuredClone(server.adaptive.currentNeedHistory)
    expect(needs).toHaveLength(100)
    applyWalEntry(server, compacted)
    expect(server.adaptive.currentNeedHistory).toEqual(needs)
    expect(server.adaptive.currentNeeds).toEqual(profile.adaptive.currentNeeds)
    expect(server.problemLog).toHaveLength(150)
    expect(server.adaptive.skillStates).toEqual(profile.adaptive.skillStates)
    // An older client may still send a full checkpoint after a newer event.
    applyWalEntry(server, { ...event, payload: { ...event.payload,
      capturedAt: event.payload.capturedAt + 1,
      adaptive: { ...profile.adaptive, currentNeedHistory: [], currentNeeds: {} } } })
    expect(server.adaptive.currentNeedHistory).toEqual(needs)
    expect(server.adaptive.currentNeeds).toEqual(profile.adaptive.currentNeeds)
  })
  it('compacts actual selection history as well as telemetry, preserving ability and aggregates', () => {
    const profile = createStudentProfile('A'.repeat(32), 'Test')
    for (let i = 0; i < 200; i++) {
      annotateSelectedProblem(profile, { operation: 'addition', metadata: { skillTag: 'add_1d_1d' } },
        { reason: 'normal', bucket: 'core', targetLevel: 1 })
    }
    const event = { id: 'long-session-checkpoint', type: 'profile_checkpoint', timestamp: 1000,
      payload: { capturedAt: 1000, adaptive: profile.adaptive, stats: profile.stats,
        telemetry: { events: [], daily: { '2026-09-25': { practice_answers: 200 } } } } }
    expect(validEntry(event, profile.studentId)).toBe(false)
    const repaired = compactCheckpointEvent(event)
    expect(validEntry(repaired, profile.studentId)).toBe(true)
    expect(repaired.payload.adaptive.skillStates).toEqual(profile.adaptive.skillStates)
    expect(repaired.payload.stats).toEqual(profile.stats)
    expect(repaired.payload.telemetry.daily).toEqual(event.payload.telemetry.daily)
    expect(profile.adaptive.recentSelections).toHaveLength(200)
  })
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
