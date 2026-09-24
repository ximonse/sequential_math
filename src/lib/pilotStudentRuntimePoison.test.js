import { describe, it, expect, vi } from 'vitest'
import { buildBatches, createPilotStudentRuntime } from './pilotStudentRuntime'

// Events queued before a validation fix stay invalid forever. Without a guard
// they block every later result from ever reaching the server.
function makeStore(events) {
  const acknowledged = []
  const rejected = []
  return {
    acknowledged,
    rejected,
    listPendingEvents: vi.fn(async () => events.filter(event => !acknowledged.includes(event.id) && !rejected.includes(event.id)).map(event => ({ event }))),
    countRejectedEvents: vi.fn(async () => rejected.length),
    rejectEvents: vi.fn(async ids => { rejected.push(...ids) }),
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
