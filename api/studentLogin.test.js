import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStudentProfile } from '../src/lib/studentProfile'
import { hashPasswordWithSalt } from './_studentPassword'
const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  exists: vi.fn(async key => records.has(key) ? 1 : 0),
  smembers: vi.fn(async key => [...(records.get(key) || [])])
} }))
import handler from './student-login'

async function call(method = 'POST', body = { name: 'Anna', password: 'Anna' }) {
  const res = {
    code: 200, headers: {},
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.code = code; return this },
    json(data) { this.data = data; return this }, end() { return this }
  }
  await handler({ method, body, headers: {} }, res)
  return res
}

function pupil(id, name = 'Anna', classId = 'class-a', password = name) {
  const profile = createStudentProfile(id, name)
  Object.assign(profile, { classId, classIds: [classId],
    auth: { passwordScheme: 'sha256-v1', passwordSalt: 'test-salt', passwordHash: hashPasswordWithSalt(password, 'test-salt') } })
  records.set('student:' + id, profile)
  records.set('students:index', [...(records.get('students:index') || []), id])
  return profile
}

beforeEach(() => {
  records.clear()
  records.set('classes:index', ['class-a', 'class-b'])
  records.set('class:class-a', { id: 'class-a', name: '6A', schoolId: 'north' })
  records.set('class:class-b', { id: 'class-b', name: '6A', schoolId: 'south' })
  pupil('ANNA_A1B2C3')
})

describe('login with teacher-assigned membership', () => {
  it('does not publish a school, class or pupil directory', async () => {
    const result = await call('GET')
    expect(result.code).toBe(405)
    expect(result.data).toEqual({ error: 'Method not allowed' })
    expect(result.headers['Cache-Control']).toBe('no-store')
  })
  it('resolves a unique display name without school or class input', async () => {
    expect(await call()).toMatchObject({ code: 200, data: { studentId: 'ANNA_A1B2C3' } })
  })
  it('accepts the normalized stable ID without scanning the pupil index', async () => {
    const { kv } = await import('@vercel/kv')
    kv.smembers.mockClear()
    expect(await call('POST', { name: ' anna_a1b2c3 ', password: 'Anna' }))
      .toMatchObject({ code: 200, data: { studentId: 'ANNA_A1B2C3' } })
    expect(kv.smembers).not.toHaveBeenCalled()
  })
  it.each([
    { name: 'Nobody', password: 'Anna' },
    { name: 'Anna', password: 'wrong' },
    { name: 'ANNA_A1B2C3', password: 'wrong' }
  ])('does not reveal IDs for incorrect credentials', async body => {
    const result = await call('POST', body)
    expect(result.code).toBe(401)
    expect(result.data.studentId).toBeUndefined()
  })
  it('requires a stable ID when names are duplicated, even across schools', async () => {
    pupil('ANNA_OTHER', 'Anna', 'class-b', 'different-password')
    expect(await call()).toMatchObject({ code: 409, data: { error: expect.stringContaining('elev-ID') } })
    expect((await call('POST', { name: 'Anna', password: 'wrong' })).code).toBe(401)
    expect(await call('POST', { name: 'ANNA_OTHER', password: 'different-password' }))
      .toMatchObject({ code: 200, data: { studentId: 'ANNA_OTHER' } })
  })
  it('preserves legacy ID login when a display name matches that ID', async () => {
    pupil('ANNA', 'Anna Legacy', 'class-a', 'legacy-password')
    expect(await call('POST', { name: 'Anna', password: 'legacy-password' }))
      .toMatchObject({ code: 200, data: { studentId: 'ANNA' } })
    expect((await call()).code).toBe(401)
  })
  it('normalizes Swedish names and whitespace, but preserves password case', async () => {
    pupil('ASA_TEST', 'Åsa   Öberg', 'class-a', 'Åsa Öberg')
    expect(await call('POST', { name: '  åsa öberg ', password: 'Åsa Öberg' }))
      .toMatchObject({ code: 200, data: { studentId: 'ASA_TEST' } })
    expect((await call('POST', { name: 'åsa öberg', password: 'åsa öberg' })).code).toBe(401)
  })
  it('keeps teacher-assigned school and group memberships unchanged after login', async () => {
    const profile = records.get('student:ANNA_A1B2C3')
    profile.classId = 'class-b'; profile.classIds = ['class-b', 'class-a']
    const before = structuredClone(records)
    expect((await call()).code).toBe(200)
    expect((await call('POST', { name: 'ANNA_A1B2C3', password: 'Anna' })).code).toBe(200)
    expect(records).toEqual(before)
  })
  it.each([{ classId: 'class-b' }, { schoolId: 'south' }])('rejects attempts to choose membership during login', async fields => {
    const before = structuredClone(records)
    expect((await call('POST', { name: 'Anna', password: 'Anna', ...fields })).code).toBe(400)
    expect(records).toEqual(before)
  })
  it('rejects deleted pupils for names and IDs despite stale records', async () => {
    records.set('student_deleted:ANNA_A1B2C3', {})
    expect((await call()).code).toBe(401)
    expect((await call('POST', { name: 'ANNA_A1B2C3', password: 'Anna' })).code).toBe(401)
  })
  it('does not lock out a pupil whose teacher has not assigned a class yet', async () => {
    const profile = records.get('student:ANNA_A1B2C3')
    profile.classId = null; profile.classIds = []
    expect((await call()).code).toBe(200)
  })
  it('does not accept unsupported profiles or invalid input', async () => {
    expect((await call('POST', { name: '', password: 'Anna' })).code).toBe(400)
    delete records.get('student:ANNA_A1B2C3').profileSchemaVersion
    expect((await call()).code).toBe(401)
  })
})
