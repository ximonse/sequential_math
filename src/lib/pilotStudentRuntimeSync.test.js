import { describe, expect, it, vi } from 'vitest'
import { createPilotStudentRuntime } from './pilotStudentRuntime'

const studentId = 'B'.repeat(32)
const profile = { studentId, currentDifficulty: 1, highestDifficulty: 1, adaptive: { skillStates: {} }, stats: { totalProblems: 0 }, recentProblems: [], problemLog: [] }

// Answers given just before the pupil closed the tab were left only on the device
// (production test class 2026-10-31). Syncs now run one at a time and a hidden
// page sends what is pending with keepalive.
function vault(pending) {
  return {
    saveSnapshot: vi.fn(async () => {}), saveSnapshotAndAppendEvent: vi.fn(async ({ event }) => { pending.push(event) }),
    listPendingEvents: vi.fn(async () => pending.map(event => ({ event }))),
    countRejectedEvents: vi.fn(async () => 0), listRejectedEvents: vi.fn(async () => []),
    rejectEvents: vi.fn(async () => {}), supersedeRejectedEvents: vi.fn(async () => {}),
    acknowledgeEvents: vi.fn(async ids => { for (const id of ids) pending.splice(pending.findIndex(e => e.id === id), 1) }),
    pruneAcknowledgedEvents: vi.fn(async () => 0),
    close: vi.fn()
  }
}
const event = id => ({ id, type: 'problem_result', studentId, timestamp: 1, payload: { problemId: id } })

// Minimal page stand-ins (no DOM library in this repo); the runtime only listens for events.
const page = new EventTarget()
page.visibilityState = 'visible'
globalThis.document = page
globalThis.window = new EventTarget()

describe('pilot runtime sync', () => {
  it('never sends two batches at the same time', async () => {
    const pending = []
    let active = 0, maxActive = 0
    const postEvents = vi.fn(async entries => {
      active++; maxActive = Math.max(maxActive, active)
      await new Promise(resolve => setTimeout(resolve, 5))
      active--
      return { ok: true, ack: entries.map(e => e.id) }
    })
    const runtime = createPilotStudentRuntime({ createStore: async () => vault(pending), resumeSession: async () => ({ ok: true, student: { studentId } }),
      fetchProfile: async () => ({ ok: true, profile }), postEvents })
    await runtime.bootstrap(studentId)
    await Promise.all(['e1', 'e2', 'e3'].map(id => runtime.persistEvent(profile, event(id))))
    expect(maxActive).toBe(1)
    expect(pending).toHaveLength(0)
  })

  it('sends pending answers with keepalive when the page is hidden', async () => {
    const pending = []
    const postEvents = vi.fn(async entries => ({ ok: true, ack: entries.map(e => e.id) }))
    const runtime = createPilotStudentRuntime({ createStore: async () => vault(pending), resumeSession: async () => ({ ok: true, student: { studentId } }),
      fetchProfile: async () => ({ ok: true, profile }), postEvents })
    await runtime.bootstrap(studentId)
    pending.push(event('last'))
    page.visibilityState = 'hidden'
    page.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(postEvents).toHaveBeenCalledWith([expect.objectContaining({ id: 'last' })], { keepalive: true }))
  })

  it('removes old confirmed events before the login sync reads the vault', async () => {
    const pending = [], order = []
    const store = vault(pending)
    store.pruneAcknowledgedEvents.mockImplementation(async () => { order.push('prune'); return 3 })
    store.listPendingEvents.mockImplementation(async () => { order.push('list'); return [] })
    const runtime = createPilotStudentRuntime({ createStore: async () => store, resumeSession: async () => ({ ok: true, student: { studentId } }),
      fetchProfile: async () => ({ ok: true, profile }), postEvents: vi.fn() })
    await runtime.bootstrap(studentId)
    expect(order.slice(0, 2)).toEqual(['prune', 'list'])
  })
})
