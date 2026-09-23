import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execFileSync } from 'node:child_process'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  exists: vi.fn(async key => records.has(key) ? 1 : 0),
  set: vi.fn(async (key, value) => { records.set(key, structuredClone(value)); return 'OK' }),
  del: vi.fn(async key => records.delete(key)),
  incr: vi.fn(async key => { const value = Number(records.get(key) || 0) + 1; records.set(key, value); return value }),
  expire: vi.fn(async () => 1),
  eval: vi.fn(async (script, keys, args) => {
    if (keys.length === 1) { const value = Number(records.get(keys[0]) || 0) + 1; records.set(keys[0], value); return value }
    const [key, deletedKey, indexKey] = keys
    const [expected, operation, json, id] = args
    if (records.has(deletedKey)) return -2
    const current = records.get(key), version = current ? Number(current.serverRevision) || 0 : -1
    if (version !== Number(expected)) return 0
    const index = new Set(records.get(indexKey) || [])
    if (operation === 'delete') { records.set(deletedKey, json); records.delete(key); index.delete(id) }
    else { records.set(key, JSON.parse(json)); index.add(id) }
    records.set(indexKey, [...index])
    return 1
  })
} }))

import { createPilotStudentAuth, createQrSecret } from './_studentSession.js'
import sessionHandler from './student-session.js'
import profileHandler from './me/profile.js'
import eventsHandler from './me/events.js'

const ORIGIN = 'https://matematik.ximon.se'
function response() { return { code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value }, status(code) { this.code = code; return this }, json(data) { this.data = data; return this }, end() { return this } } }
function pupil(id, secret) {
  return { profileSchemaVersion: 1, studentId: id, displayAlias: 'Röd Räv 17', grade: 6,
    classId: '6a', classIds: ['6a'], currentDifficulty: 1, highestDifficulty: 1,
    adaptive: { skillStates: {}, recentSelections: [] }, recentProblems: [], problemLog: [],
    masteryFacts: { version: 1, facts: [], revokedIds: [] }, stats: {},
    auth: { ...createPilotStudentAuth({ qrSecret: secret, pin: '1234' }), privateMarker: 'remove-me' } }
}
async function login(id, secret) {
  const res = response()
  await sessionHandler({ method: 'POST', headers: { origin: ORIGIN }, body: { studentId: id, qrSecret: secret, pin: '1234' }, socket: {} }, res)
  return { cookie: res.headers['Set-Cookie'].split(';')[0], csrfToken: res.data.csrfToken }
}

beforeEach(() => { records.clear(); process.env.APP_ORIGIN = ORIGIN })

describe('session-bound pupil APIs', () => {
  it('loads the event API with native Node module resolution', () => {
    expect(() => execFileSync(process.execPath, [
      '--input-type=module', '-e', "await import('./api/me/events.js')"
    ], { cwd: process.cwd(), stdio: 'pipe' })).not.toThrow()
  })

  it('returns only the authenticated profile and never credential material', async () => {
    const id = 'A'.repeat(32), secret = createQrSecret()
    records.set('class:6a', { id: '6a' }); records.set(`student:${id}`, pupil(id, secret))
    const auth = await login(id, secret), res = response()
    await profileHandler({ method: 'GET', headers: { cookie: auth.cookie } }, res)
    expect(res.code).toBe(200)
    expect(res.data.profile).toMatchObject({ studentId: id, displayAlias: 'Röd Räv 17' })
    expect(res.data.profile.auth).toEqual({ lastLoginAt: null, loginCount: 0, passwordUpdatedAt: null })
    expect(JSON.stringify(res.data)).not.toMatch(/passwordHash|passwordSalt|passwordScheme|qrSecretHash|credentialVersion|privateMarker|"pin"/i)
  })

  it('does not send an active ticket answer or hidden correctness to the pilot browser', async () => {
    const id = 'E'.repeat(32), secret = createQrSecret()
    const profile = pupil(id, secret)
    profile.ticketInbox = { activeDispatchId: 'ticket-1', activeEncoded: 'legacy-secret', activePayload: {
      dispatchId: 'ticket-1', question: 'Vad är 2 + 2?', answer: '4', showCorrectnessOnSubmit: false
    } }
    profile.ticketResponses = [{ dispatchId: 'ticket-1', expectedAnswer: '4', studentAnswer: '3', isCorrect: false,
      normalizedExpectedAnswer: '4', normalizedStudentAnswer: '3', showCorrectnessOnSubmit: false }]
    records.set('class:6a', { id: '6a' }); records.set(`student:${id}`, profile)
    const auth = await login(id, secret), res = response()
    await profileHandler({ method: 'GET', headers: { cookie: auth.cookie } }, res)
    expect(res.code).toBe(200)
    expect(res.data.profile.ticketInbox.activePayload).toMatchObject({ dispatchId: 'ticket-1', question: 'Vad är 2 + 2?' })
    expect(res.data.profile.ticketInbox.activePayload.answer).toBeUndefined()
    expect(res.data.profile.ticketInbox.activeEncoded).toBe('')
    expect(res.data.profile.ticketResponses[0]).not.toHaveProperty('expectedAnswer')
    expect(res.data.profile.ticketResponses[0]).not.toHaveProperty('isCorrect')
    expect(JSON.stringify(res.data.profile)).not.toContain('legacy-secret')
  })

  it('requires origin and CSRF and rejects an entry for another pupil', async () => {
    const id = 'B'.repeat(32), secret = createQrSecret()
    records.set('class:6a', { id: '6a' }); records.set(`student:${id}`, pupil(id, secret))
    const auth = await login(id, secret)
    const entry = { id: 'event-1', studentId: 'C'.repeat(32), type: 'problem_result', timestamp: 10,
      payload: { problemId: 'problem-1', timestamp: 10, correct: true } }
    const missingCsrf = response()
    await eventsHandler({ method: 'POST', headers: { cookie: auth.cookie, origin: ORIGIN }, body: { entries: [entry] } }, missingCsrf)
    expect(missingCsrf.code).toBe(401)
    const crossPupil = response()
    await eventsHandler({ method: 'POST', headers: { cookie: auth.cookie, origin: ORIGIN, 'x-csrf-token': auth.csrfToken }, body: { entries: [entry] } }, crossPupil)
    expect(crossPupil.code).toBe(400)
    expect(records.get(`student:${id}`).problemLog).toEqual([])
  })

  it('stores an idempotent event and rejects the cookie after credential rotation', async () => {
    const id = 'D'.repeat(32), secret = createQrSecret()
    records.set('class:6a', { id: '6a' }); records.set(`student:${id}`, pupil(id, secret))
    const auth = await login(id, secret)
    const entry = { id: 'event-1', type: 'problem_result', timestamp: 20,
      payload: { problemId: 'problem-1', timestamp: 20, correct: true } }
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = response()
      await eventsHandler({ method: 'POST', headers: { cookie: auth.cookie, origin: ORIGIN, 'x-csrf-token': auth.csrfToken }, body: { entries: [entry] } }, res)
      expect(res.code).toBe(200)
    }
    expect(records.get(`student:${id}`).problemLog).toHaveLength(1)
    const rotated = records.get(`student:${id}`); rotated.auth.credentialVersion += 1; records.set(`student:${id}`, rotated)
    const denied = response(); await profileHandler({ method: 'GET', headers: { cookie: auth.cookie } }, denied)
    expect(denied.code).toBe(401)
  })
})
