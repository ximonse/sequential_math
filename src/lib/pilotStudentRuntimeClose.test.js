import { expect, it, vi } from 'vitest'
import { createPilotStudentRuntime } from './pilotStudentRuntime'

const ID = 'A'.repeat(32)

// The local save encrypts first and opens its transaction afterwards. Logout
// closed the database in between ("The database connection is closing",
// 2026-11-16) and the answer was not kept on the device.
function slowStore() {
  let closed = false
  let release
  const encrypting = new Promise(resolve => { release = resolve })
  const saved = []
  return {
    saved, release,
    get closed() { return closed },
    pruneAcknowledgedEvents: async () => {},
    listPendingEvents: async () => [],
    countRejectedEvents: async () => 0,
    listRejectedEvents: async () => [],
    saveSnapshot: async () => {},
    saveSnapshotAndAppendEvent: vi.fn(async ({ event }) => {
      await encrypting
      if (closed) throw new DOMException('The database connection is closing.', 'InvalidStateError')
      saved.push(event.id)
    }),
    close: () => { closed = true }
  }
}

it('keeps an answer that is being saved when the pupil logs out', async () => {
  const store = slowStore()
  const runtime = createPilotStudentRuntime({
    createStore: async () => store,
    hasBoundSession: () => true,
    fetchProfile: async () => ({ ok: true, profile: { studentId: ID } }),
    postEvents: async entries => ({ ok: true, ack: entries.map(entry => entry.id) })
  })
  await runtime.bootstrap(ID)
  const answer = runtime.persistEvent({ studentId: ID }, { id: 'answer-1', type: 'problem_result', payload: { problemId: 'p1' } })
  const closing = runtime.close()
  // Encryption of a large profile outlasts the logout's own steps.
  await new Promise(resolve => setTimeout(resolve, 10))
  store.release()
  await expect(answer).resolves.toBeDefined()
  await closing
  expect(store.saved).toEqual(['answer-1'])
  expect(store.closed).toBe(true)
})
