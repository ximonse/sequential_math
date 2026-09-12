import { describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  set: vi.fn(async (key, value) => records.set(key, structuredClone(value))),
  del: vi.fn(async key => records.delete(key)),
  incr: vi.fn(async key => { const value = Number(records.get(key) || 0) + 1; records.set(key, value); return value }),
  expire: vi.fn(async () => 1)
} }))

import { createPilotStudentAuth, createQrSecret, getLiveStudentSession, verifyPilotStudentCredentials } from './_studentSession.js'
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
    records.clear(); const id = 'A'.repeat(32), secret = createQrSecret(); const saved = profile(id, secret); records.set(`student:${id}`, saved)
    const login = response(); await handler({ method: 'POST', body: { studentId: id, qrSecret: secret, pin: '1234' }, headers: {}, socket: {} }, login)
    expect(login.code).toBe(201); expect(login.headers['Set-Cookie']).toContain('__Host-student-session='); expect(login.headers['Set-Cookie']).toContain('HttpOnly; Secure; SameSite=Strict')
    const cookie = login.headers['Set-Cookie'].split(';')[0]
    await expect(getLiveStudentSession({ headers: { cookie } })).resolves.toMatchObject({ profile: { studentId: id } })
    saved.auth.credentialVersion += 1; records.set(`student:${id}`, saved)
    await expect(getLiveStudentSession({ headers: { cookie } })).resolves.toBeNull()
  })
  it('does not reveal whether an unknown or wrong credential failed', async () => {
    records.clear(); const id = 'B'.repeat(32), secret = createQrSecret(); records.set(`student:${id}`, profile(id, secret))
    const wrong = response(), unknown = response()
    await handler({ method: 'POST', body: { studentId: id, qrSecret: secret, pin: '0000' }, headers: {}, socket: {} }, wrong)
    await handler({ method: 'POST', body: { studentId: 'C'.repeat(32), qrSecret: secret, pin: '0000' }, headers: {}, socket: {} }, unknown)
    expect(wrong).toMatchObject({ code: 401, data: { error: 'Inloggningen kunde inte bekräftas.' } })
    expect(unknown).toMatchObject({ code: 401, data: { error: 'Inloggningen kunde inte bekräftas.' } })
  })
})
