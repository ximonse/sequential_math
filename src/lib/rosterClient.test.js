import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { submitPilotRoster, submitRoster } from './rosterClient'
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

it('submits pseudonymous pilot seats without credential persistence and retries with the same request ID', async () => {
  const bodies = []
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    bodies.push(JSON.parse(options.body))
    if (bodies.length === 1) throw new Error('Response lost')
    return { ok: true, json: async () => ({
      ok: true, class: { id: 'PILOT' }, results: [
        { ok: true, studentId: 'A'.repeat(32), displayAlias: 'Blå Räv', qrSecret: 'q'.repeat(43), pin: '1234' },
        { ok: true, studentId: 'B'.repeat(32), displayAlias: 'Grön Sten', qrSecret: 'r'.repeat(43), pin: '5678' }
      ]
    }) }
  }))
  const input = { className: '4A', schoolId: 'school-1', count: 2 }
  expect((await submitPilotRoster(input)).ok).toBe(false)
  const result = await submitPilotRoster(input)
  expect(result.ok).toBe(true)
  expect(result.credentials).toHaveLength(2)
  expect(bodies[0]).toMatchObject({ className: '4A', schoolId: 'school-1', pilotCount: 2 })
  expect(bodies[0].requestId).toBe(bodies[1].requestId)
  const stored = localStorage.getItem('mathapp_pending_pilot_roster_request') || ''
  expect(stored).not.toContain('1234')
  expect(stored).not.toContain('q'.repeat(43))
  expect(stored).toBe('')
})

it('rejects malformed pilot credentials without treating the roster as saved', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({
    ok: true, class: { id: 'PILOT' }, results: [
      { ok: true, studentId: 'A'.repeat(32), displayAlias: 'Blå Räv', qrSecret: 'short', pin: '1234' }
    ]
  }) })))
  const result = await submitPilotRoster({ className: '4A', count: 1 })
  expect(result.ok).toBe(false)
  expect(localStorage.getItem('mathapp_pending_pilot_roster_request')).not.toBeNull()
})
