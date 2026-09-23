import { describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  exists: vi.fn(async key => records.has(key) ? 1 : 0),
  set: vi.fn(async (key, value) => records.set(key, structuredClone(value))),
  del: vi.fn(async key => records.delete(key)),
  incr: vi.fn(async key => { const value = Number(records.get(key) || 0) + 1; records.set(key, value); return value }),
  expire: vi.fn(async () => 1),
  eval: vi.fn(async (_script, keys) => { const key = keys[0]; const value = Number(records.get(key) || 0) + 1; records.set(key, value); return value })
} }))

import { createPilotStudentAuth, createQrSecret, getLiveStudentSession, isStudentLoginIpRateLimited, MAX_STUDENT_LOGIN_FAILURES_PER_IP, recordStudentLoginFailure, requestOriginIsTrusted, studentLoginCodeIndexKey, verifyPilotStudentCredentials } from './_studentSession.js'
import handler from './student-session.js'

function response() { return { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v }, status(code) { this.code = code; return this }, json(data) { this.data = data; return this }, end() { return this } } }
function profile(id, secret) { return { profileSchemaVersion: 1, studentId: id, displayAlias: 'Räv 17', classId: '6a', classIds: ['6a'], grade: 6, recentProblems: [], problemLog: [], masteryFacts: { facts: [], revokedIds: [] }, stats: {}, auth: createPilotStudentAuth({ qrSecret: secret, pin: '1234' }) } }

describe('pilot student sessions', () => {
  it('uses a QR secret and four-digit PIN without accepting either alone', () => {
    const secret = createQrSecret(), auth = createPilotStudentAuth({ qrSecret: secret, pin: '1234' })
    expect(verifyPilotStudentCredentials(auth, secret, '1234')).toBe(true)
    expect(verifyPilotStudentCredentials(auth, secret, '0000')).toBe(false)
    expect(verifyPilotStudentCredentials(auth, createQrSecret(), '1234')).toBe(false)
  })
  it('creates a secure cookie session and rejects it after credential rotation', async () => {
    records.clear(); records.set('class:6a', { id: '6a', teacherIds: ['teacher-1'] }); const id = 'A'.repeat(32), secret = createQrSecret(); const saved = profile(id, secret); records.set(`student:${id}`, saved)
    process.env.APP_ORIGIN = 'https://matematik.ximon.se'
    const login = response(); await handler({ method: 'POST', body: { studentId: id, qrSecret: secret, pin: '1234' }, headers: { origin: process.env.APP_ORIGIN }, socket: {} }, login)
    expect(login.code).toBe(201); expect(login.headers['Set-Cookie']).toContain('__Host-student-session='); expect(login.headers['Set-Cookie']).toContain('HttpOnly; Secure; SameSite=Strict')
    const cookie = login.headers['Set-Cookie'].split(';')[0]
    await expect(getLiveStudentSession({ headers: { cookie } })).resolves.toMatchObject({ profile: { studentId: id } })
    saved.auth.credentialVersion += 1; records.set(`student:${id}`, saved)
    await expect(getLiveStudentSession({ headers: { cookie } })).resolves.toBeNull()
  })
  it('allows a registered three-word code plus PIN without requiring the QR secret', async () => {
    records.clear()
    const id = 'D'.repeat(32), secret = createQrSecret(), code = 'Gul Fyr Katt'
    records.set('class:6a', { id: '6a', teacherIds: ['teacher-1'] })
    records.set(`student:${id}`, { ...profile(id, secret), displayAlias: code })
    records.set(studentLoginCodeIndexKey(code), id)
    process.env.APP_ORIGIN = 'https://matematik.ximon.se'

    const login = response()
    await handler({ method: 'POST', body: { loginCode: ' gul  fyr katt ', pin: '1234' }, headers: { origin: process.env.APP_ORIGIN }, socket: {} }, login)

    expect(login).toMatchObject({ code: 201, data: { ok: true, student: { studentId: id } } })
  })
  it('also accepts a QR card for an existing named pupil ID', async () => {
    records.clear()
    const id = 'ANNA_A1B2C3', secret = createQrSecret()
    records.set('class:6a', { id: '6a', teacherIds: ['teacher-1'] })
    records.set(`student:${id}`, { ...profile(id, secret), name: 'Anna' })
    process.env.APP_ORIGIN = 'https://matematik.ximon.se'

    const login = response()
    await handler({ method: 'POST', body: { studentId: id, qrSecret: secret, pin: '1234' }, headers: { origin: process.env.APP_ORIGIN }, socket: {} }, login)

    expect(login).toMatchObject({ code: 201, data: { ok: true, student: { studentId: id } } })
  })
  it('allows only the current Vercel preview host alongside the configured production origin', () => {
    const previousOrigin = process.env.APP_ORIGIN
    const previousEnvironment = process.env.VERCEL_ENV
    try {
      process.env.APP_ORIGIN = 'https://matematik.ximon.se'
      process.env.VERCEL_ENV = 'preview'
      expect(requestOriginIsTrusted({ headers: {
        origin: 'https://sekvens-abc123-ximonses-projects.vercel.app',
        host: 'sekvens-abc123-ximonses-projects.vercel.app'
      } })).toBe(true)
      expect(requestOriginIsTrusted({ headers: {
        origin: 'https://other-project.vercel.app',
        host: 'sekvens-abc123-ximonses-projects.vercel.app'
      } })).toBe(false)
      delete process.env.APP_ORIGIN
      expect(requestOriginIsTrusted({ headers: {
        origin: 'https://sekvens-abc123-ximonses-projects.vercel.app',
        host: 'sekvens-abc123-ximonses-projects.vercel.app'
      } })).toBe(true)
      expect(requestOriginIsTrusted({ headers: {
        origin: 'https://other-project.vercel.app',
        host: 'sekvens-abc123-ximonses-projects.vercel.app'
      } })).toBe(false)
      process.env.VERCEL_ENV = 'production'
      expect(requestOriginIsTrusted({ headers: {
        origin: 'https://sekvens-abc123-ximonses-projects.vercel.app',
        host: 'sekvens-abc123-ximonses-projects.vercel.app'
      } })).toBe(false)
    } finally {
      if (previousOrigin === undefined) delete process.env.APP_ORIGIN
      else process.env.APP_ORIGIN = previousOrigin
      if (previousEnvironment === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = previousEnvironment
    }
  })
  it('does not reveal whether an unknown or wrong credential failed', async () => {
    records.clear(); const id = 'B'.repeat(32), secret = createQrSecret(); records.set(`student:${id}`, profile(id, secret))
    const wrong = response(), unknown = response()
    process.env.APP_ORIGIN = 'https://matematik.ximon.se'
    await handler({ method: 'POST', body: { studentId: id, qrSecret: secret, pin: '0000' }, headers: { origin: process.env.APP_ORIGIN }, socket: {} }, wrong)
    await handler({ method: 'POST', body: { studentId: 'C'.repeat(32), qrSecret: secret, pin: '0000' }, headers: { origin: process.env.APP_ORIGIN }, socket: {} }, unknown)
    expect(wrong).toMatchObject({ code: 401, data: { error: 'Inloggningen kunde inte bekräftas.' } })
    expect(unknown).toMatchObject({ code: 401, data: { error: 'Inloggningen kunde inte bekräftas.' } })
  })
  it('uses an atomic broad IP backstop without clearing it after one successful pupil', async () => {
    records.clear()
    for (let index = 0; index < MAX_STUDENT_LOGIN_FAILURES_PER_IP; index++) {
      await recordStudentLoginFailure(`PUPIL-${index}`, '192.0.2.10')
    }
    await expect(isStudentLoginIpRateLimited('192.0.2.10')).resolves.toBe(true)
  })
})
