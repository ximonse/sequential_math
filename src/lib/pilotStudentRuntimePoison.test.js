import { describe, it, expect, vi } from 'vitest'
import { createPilotStudentRuntime } from './pilotStudentRuntime'

// Events queued before a validation fix stay invalid forever. Without a guard
// they block every later result from ever reaching the server.
function makeStore(events) {
  const acknowledged = []
  return {
    acknowledged,
    listPendingEvents: vi.fn().mockResolvedValue(events.map(event => ({ event }))),
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
  it('kastar den ogiltiga händelsen och skickar de giltiga', async () => {
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
    expect(store.acknowledged).toContain('good')
    expect(store.acknowledged).toContain('bad')
  })

  it('behåller kön vid nätverksfel', async () => {
    const store = makeStore([{ id: 'a', type: 'problem_result', payload: { problemId: 'p1' } }])
    const postEvents = vi.fn(async () => ({ ok: false, error: 'Kunde inte nå tjänsten.' }))

    const result = await runSync(store, postEvents)

    expect(result.ok).toBe(false)
    expect(store.acknowledged).toEqual([])
  })
})
