import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  set: vi.fn(async (key, value, options = {}) => {
    if (options.nx && records.has(key)) return null
    records.set(key, structuredClone(value))
    return 'OK'
  }),
  del: vi.fn(async key => records.delete(key)),
  smembers: vi.fn(async key => [...(records.get(key) || [])])
} }))

import handler from './admin-recovery.js'
import { hashTeacherPassword, verifyTeacherPassword } from './_helpers.js'

function response() {
  return { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value }, status(code) { this.code = code; return this }, json(data) { this.data = data; return this }, send(data) { this.data = data; return this }, end() {} }
}
async function call(token, password, adminId = 'admin') {
  const res = response()
  await handler({ method: 'POST', query: { token }, headers: {}, body: { password, adminId } }, res)
  return res
}

describe('temporary admin recovery', () => {
  beforeEach(() => {
    records.clear()
    const { hash, salt, scheme } = hashTeacherPassword('old-password')
    records.set('teacher_accounts:index', ['admin'])
    records.set('teacher_account:admin', { id: 'admin', isAdmin: true, sessionVersion: 3, passwordHash: hash, passwordSalt: salt, passwordScheme: scheme })
    process.env.ADMIN_RECOVERY_TOKEN_HASH = createHash('sha256').update('one-time-token').digest('hex')
    process.env.ADMIN_RECOVERY_EXPIRES_AT = String(Date.now() + 60_000)
  })

  it('changes the only admin password once and revokes active sessions', async () => {
    expect(await call('wrong-token', 'new-password')).toMatchObject({ code: 410 })
    expect(await call('one-time-token', 'new-password')).toMatchObject({ code: 200, data: { ok: true } })
    const account = records.get('teacher_account:admin')
    expect(verifyTeacherPassword('new-password', account.passwordHash, account.passwordSalt)).toBe(true)
    expect(account.sessionVersion).toBe(4)
    expect(await call('one-time-token', 'another-password')).toMatchObject({ code: 410 })
  })

  it('requires an explicit account selection when multiple admins are active', async () => {
    const { hash, salt, scheme } = hashTeacherPassword('other-password')
    records.set('teacher_accounts:index', ['admin', 'other'])
    records.set('teacher_account:other', { id: 'other', isAdmin: true, sessionVersion: 1, passwordHash: hash, passwordSalt: salt, passwordScheme: scheme })
    expect(await call('one-time-token', 'new-password', 'missing')).toMatchObject({ code: 409 })
    expect(await call('one-time-token', 'new-password', 'other')).toMatchObject({ code: 200 })
    expect(verifyTeacherPassword('new-password', records.get('teacher_account:other').passwordHash, records.get('teacher_account:other').passwordSalt)).toBe(true)
  })
})
