import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { submitRoster } from './rosterClient'
vi.mock('./teacherAuth', () => ({ getTeacherApiToken: () => 'synthetic-token', getTeacherIdentity: () => ({ teacherId: 'synthetic-owner' }) }))
beforeEach(() => {
  const data = new Map()
  vi.stubGlobal('localStorage', { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) })
})
afterEach(() => vi.unstubAllGlobals())

it('preserves names, repeats the same request after a lost response, and only confirms complete results', async () => {
  const bodies = []
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    bodies.push(JSON.parse(options.body))
    if (bodies.length === 1) throw new Error('Response lost')
    return { ok: true, json: async () => ({ ok: true, class: { id: 'SYNTHETIC' },
      results: bodies.at(-1).names.map((name, index) => ({ name, studentId: `SYNTH-${index}`, ok: true })) }) }
  }))
  const input = { className: 'Synthetic', rosterText: 'Lo A\nElsa, Karl; Karl' }
  expect((await submitRoster(input)).ok).toBe(false)
  const second = await submitRoster(input)
  expect(second.ok).toBe(true)
  expect(second.addedCount).toBe(4)
  expect(bodies[0].names).toEqual(['Lo A', 'Elsa', 'Karl', 'Karl'])
  expect(bodies[0].requestId).toBe(bodies[1].requestId)
  expect(localStorage.getItem('mathapp_pending_roster_request')).toBeNull()
})

it('retains the retry ID and identifies failed pupils after partial saving', async () => {
  const bodies = []
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    bodies.push(JSON.parse(options.body))
    return { ok: true, json: async () => ({ ok: false, class: { id: 'SYNTHETIC' }, results: [
      { studentId: 'ONE', name: 'First', ok: true }, { studentId: 'TWO', name: 'Second', ok: false }
    ] }) }
  }))
  const input = { classId: 'SYNTHETIC', rosterText: 'First, Second' }
  const result = await submitRoster(input)
  expect(result.ok).toBe(false)
  expect(result.error).toContain('Second')
  expect(result.classRecord.studentIds).toEqual(['ONE'])
  await submitRoster(input)
  expect(bodies[0].requestId).toBe(bodies[1].requestId)
  expect(localStorage.getItem('mathapp_pending_roster_request')).not.toContain('synthetic-token')
})

it('does not report success or clear the retry key for malformed acknowledgements', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, class: { id: 'SYNTHETIC' }, results: [] }) })))
  expect((await submitRoster({ className: 'Test', rosterText: 'Karl' })).ok).toBe(false)
  expect(localStorage.getItem('mathapp_pending_roster_request')).not.toBeNull()
})
