import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null))
} }))

import {
  createTeacherSessionToken,
  getLiveTeacherAuthPayload,
  getTeacherAuthPayload,
  setTeacherSessionCookie
} from './_helpers.js'
import teacherSessionHandler from './teacher-session.js'

function response() {
  return { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value },
    status(code) { this.code = code; return this }, json(data) { this.data = data; return this },
    end() { this.ended = true; return this } }
}

describe('teacher account sessions', () => {
  beforeEach(() => {
    records.clear()
    process.env.TEACHER_API_PASSWORD = 'test-secret'
    delete process.env.TEACHER_API_PASSWORD_ROTATION_SECRET
  })

  it('rejects a token immediately when its account is deleted or its session version changes', async () => {
    const session = createTeacherSessionToken({
      teacherId: 'teacher-1', classIds: ['old-class'], sessionVersion: 2
    })
    const req = { headers: { 'x-teacher-token': session.token } }

    expect(await getLiveTeacherAuthPayload(req)).toBeNull()

    records.set('teacher_account:teacher-1', {
      id: 'teacher-1', classIds: ['new-class'], isAdmin: false, sessionVersion: 2
    })
    await expect(getLiveTeacherAuthPayload(req)).resolves.toMatchObject({
      teacherId: 'teacher-1', classIds: ['new-class'], sessionVersion: 2
    })

    records.set('teacher_account:teacher-1', {
      id: 'teacher-1', classIds: ['new-class'], isAdmin: false, sessionVersion: 3
    })
    expect(await getLiveTeacherAuthPayload(req)).toBeNull()
  })

  it('rejects retired raw-password and accountless token authentication', () => {
    expect(getTeacherAuthPayload({ headers: { 'x-teacher-token': 'test-secret' } })).toBeNull()
    expect(getTeacherAuthPayload({ headers: { 'x-teacher-password': 'test-secret' } })).toBeNull()

    const accountless = createTeacherSessionToken({ isAdmin: true })
    expect(getTeacherAuthPayload({ headers: { 'x-teacher-token': accountless.token } })).toBeNull()
  })

  it('accepts HttpOnly cookie sessions and rejects cross-origin cookie mutations', async () => {
    const session = createTeacherSessionToken({ teacherId: 'teacher-1', classIds: ['class-a'], sessionVersion: 1 })
    records.set('teacher_account:teacher-1', { id: 'teacher-1', classIds: ['class-a'], sessionVersion: 1 })
    const cookie = `__Host-teacher-session=${encodeURIComponent(session.token)}`

    await expect(getLiveTeacherAuthPayload({ method: 'GET', headers: { cookie } })).resolves.toMatchObject({
      teacherId: 'teacher-1', authSource: 'cookie'
    })
    await expect(getLiveTeacherAuthPayload({ method: 'POST', headers: { cookie, origin: 'https://evil.example' } })).resolves.toBeNull()
    await expect(getLiveTeacherAuthPayload({ method: 'POST', headers: { cookie, origin: 'https://matematik.ximon.se' } })).resolves.toMatchObject({ teacherId: 'teacher-1' })
  })

  it('clears a live teacher cookie on same-origin logout', async () => {
    const session = createTeacherSessionToken({ teacherId: 'teacher-1', sessionVersion: 1 })
    records.set('teacher_account:teacher-1', { id: 'teacher-1', classIds: [], sessionVersion: 1 })
    const res = response()
    await teacherSessionHandler({ method: 'DELETE', headers: {
      cookie: `__Host-teacher-session=${encodeURIComponent(session.token)}`,
      origin: 'https://matematik.ximon.se'
    } }, res)
    expect(res).toMatchObject({ code: 200, data: { ok: true } })
    expect(res.headers['Set-Cookie']).toContain('Max-Age=0')
  })

  it('sets the hardened teacher session cookie attributes', () => {
    const res = response()
    setTeacherSessionCookie(res, 'signed-token')
    expect(res.headers['Set-Cookie']).toMatch(/^__Host-teacher-session=.*Path=\/; Max-Age=43200; HttpOnly; Secure; SameSite=Strict$/)
  })
})
