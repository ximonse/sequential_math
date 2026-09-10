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

function pupil(id, name = 'Anna', classIds = ['class-a'], password = name) {
  const profile = createStudentProfile(id, name)
  Object.assign(profile, { classId: classIds[0] || null, classIds,
    auth: { passwordScheme: 'sha256-v1', passwordSalt: 'test-salt', passwordHash: hashPasswordWithSalt(password, 'test-salt') } })
  records.set('student:' + id, profile)
  records.set('students:index', [...(records.get('students:index') || []), id])
  return profile
}

beforeEach(() => {
  records.clear()
  records.set('class:class-a', { id: 'class-a', name: '6A', schoolId: 'north' })
  records.set('class:class-b', { id: 'class-b', name: 'Mattegrupp', schoolId: 'north' })
  records.set('school:north', { id: 'north', name: 'Ribbaskolan' })
  pupil('ANNA_A1B2C3')
})

describe('login with teacher-assigned membership', () => {
  it('does not publish a school, class or pupil directory', async () => {
    const result = await call('GET')
    expect(result.code).toBe(405)
    expect(result.data).toEqual({ error: 'Method not allowed' })
    expect(result.headers['Cache-Control']).toBe('no-store')
  })
  it('returns only the authenticated pupil assigned class after name and password', async () => {
    expect(await call()).toMatchObject({
      code: 200,
      data: {
        studentId: 'ANNA_A1B2C3',
        assignments: [{ classId: 'class-a', className: '6A', schoolId: 'north', schoolName: 'Ribbaskolan' }]
      }
    })
  })
  it('returns every group assigned to the authenticated pupil, and no others', async () => {
    records.set('class:private', { id: 'private', name: '7A', schoolId: 'north' })
    records.get('student:ANNA_A1B2C3').classIds = ['class-a', 'class-b']
    expect((await call()).data.assignments).toEqual([
      { classId: 'class-a', className: '6A', schoolId: 'north', schoolName: 'Ribbaskolan' },
      { classId: 'class-b', className: 'Mattegrupp', schoolId: 'north', schoolName: 'Ribbaskolan' }
    ])
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
  ])('does not reveal assignments for incorrect credentials', async body => {
    const result = await call('POST', body)
    expect(result.code).toBe(401)
    expect(result.data.assignments).toBeUndefined()
  })
  it('requires a stable ID when names are duplicated', async () => {
    records.set('class:class-south', { id: 'class-south', name: '6A', schoolId: 'south' })
    records.set('school:south', { id: 'south', name: 'South School' })
    pupil('ANNA_OTHER', 'Anna', ['class-south'], 'different-password')
    expect(await call()).toMatchObject({ code: 409, data: { error: expect.stringContaining('elev-ID') } })
    expect(await call('POST', { name: 'ANNA_OTHER', password: 'different-password' }))
      .toMatchObject({ code: 200, data: { studentId: 'ANNA_OTHER', assignments: [{ classId: 'class-south' }] } })
  })
  it('keeps teacher-assigned memberships unchanged after login', async () => {
    const profile = records.get('student:ANNA_A1B2C3')
    profile.classId = 'class-b'; profile.classIds = ['class-b', 'class-a']
    const before = structuredClone(records)
    expect((await call()).code).toBe(200)
    expect(records).toEqual(before)
  })
  it.each([{ classId: 'class-b' }, { schoolId: 'north' }])('rejects attempts to choose membership before authentication', async fields => {
    const before = structuredClone(records)
    expect((await call('POST', { name: 'Anna', password: 'Anna', ...fields })).code).toBe(400)
    expect(records).toEqual(before)
  })
  it('rejects deleted or unassigned pupils', async () => {
    records.set('student_deleted:ANNA_A1B2C3', {})
    expect((await call()).code).toBe(401)
    records.delete('student_deleted:ANNA_A1B2C3')
    records.get('student:ANNA_A1B2C3').classId = null
    records.get('student:ANNA_A1B2C3').classIds = []
    expect((await call()).code).toBe(403)
  })
  it('does not return a deleted class as an assignment', async () => {
    records.set('class_deleted:class-a', {})
    expect((await call()).code).toBe(403)
  })
})
