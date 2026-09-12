import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  exists: vi.fn(async key => records.has(key) ? 1 : 0),
  set: vi.fn(async (key, value) => records.set(key, structuredClone(value))),
  del: vi.fn(async key => records.delete(key)),
  smembers: vi.fn(async key => [...(records.get(key) || [])]),
  sadd: vi.fn(async (key, ...values) => {
    const members = new Set(records.get(key) || [])
    values.forEach(value => members.add(value))
    records.set(key, [...members])
  })
} }))

import handler from './highscores.js'
import { hashQrSecret } from './_studentSession.js'

const studentId = 'A'.repeat(32)
const sessionId = 'session-test-id'
const csrfToken = 'csrf-test-token'

function response() {
  return { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value },
    status(code) { this.code = code; return this }, json(data) { this.data = data; return this },
    end() { this.ended = true; return this } }
}

async function call(method, { query = {}, body = {}, headers = {} } = {}) {
  const res = response()
  await handler({ method, query, body, headers }, res)
  return res
}

beforeEach(() => {
  records.clear()
  records.set('class:class-a', { id: 'class-a', name: '6A' })
  records.set('class:class-b', { id: 'class-b', name: '6B' })
  records.set(`student:${studentId}`, {
    profileSchemaVersion: 1, studentId, displayAlias: 'Röd Sol Bok Räv', grade: 6,
    recentProblems: [], problemLog: [], masteryFacts: { facts: [], revokedIds: [] }, stats: {},
    classId: 'class-a', classIds: ['class-a'], auth: { scheme: 'qr-pin-v1', credentialVersion: 1, disabled: false }
  })
  records.set(`student_session:${sessionId}`, {
    studentId, credentialVersion: 1, csrfHash: hashQrSecret(csrfToken)
  })
  records.set('highscores:pong:class-a', [
    { studentId: 'OTHER', displayAlias: 'Blå Bro Uggla', score: 12, timestamp: 1 }
  ])
})

describe('authorized highscores', () => {
  it('rejects public reads and cross-class pupil reads', async () => {
    expect((await call('GET', { query: { game: 'pong', classId: 'class-a' } })).code).toBe(401)
    const cookie = { cookie: `__Host-student-session=${sessionId}` }
    expect((await call('GET', { query: { game: 'pong', classId: 'class-b' }, headers: cookie })).code).toBe(403)
  })

  it('returns only display data to a pupil assigned to the class', async () => {
    const res = await call('GET', { query: { game: 'pong', classId: 'class-a' },
      headers: { cookie: `__Host-student-session=${sessionId}` } })
    expect(res).toMatchObject({ code: 200, data: { highscores: [{ displayAlias: 'Blå Bro Uggla', name: 'Blå Bro Uggla', score: 12 }] } })
    expect(JSON.stringify(res.data)).not.toMatch(/OTHER|studentId|timestamp/)
  })

  it('derives score ownership from the session and requires origin plus CSRF', async () => {
    const base = { game: 'pong', classId: 'class-a', score: 25, studentId: 'ATTACKER-CONTROLLED' }
    const cookie = `__Host-student-session=${sessionId}`
    expect((await call('POST', { body: base, headers: { cookie, origin: 'https://matematik.ximon.se' } })).code).toBe(403)
    const saved = await call('POST', { body: base, headers: { cookie, origin: 'https://matematik.ximon.se', 'x-csrf-token': csrfToken } })
    expect(saved).toMatchObject({ code: 200, data: { qualified: true, rank: 1 } })
    expect(records.get('highscores:pong:class-a')[0]).toMatchObject({ studentId, displayAlias: 'Röd Sol Bok Räv', score: 25 })
    expect(JSON.stringify(saved.data)).not.toContain(studentId)
  })
})
