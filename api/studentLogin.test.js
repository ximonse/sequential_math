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

async function call(method = 'POST', body = { classId: 'class-a', name: 'Anna', password: 'Anna' }) {
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
  records.set('class:class-a', { id: 'class-a', name: '6A', teacherIds: ['private-teacher'], studentIds: ['private-student'] })
  records.set('class:class-b', { id: 'class-b', name: '6B' })
  pupil('ANNA_A1B2C3')
})

describe('class and name login', () => {
  it('lists class names without pupil or teacher data', async () => {
    const result = await call('GET')
    expect(result.data).toEqual({ classes: [{ id: 'class-a', name: '6A', schoolId: '', schoolName: 'Skola ej angiven' }, { id: 'class-b', name: '6B', schoolId: '', schoolName: 'Skola ej angiven' }] })
    expect(result.headers['Cache-Control']).toBe('no-store')
  })
  it('resolves the generated pupil ID only after a correct password', async () => {
    expect(await call()).toMatchObject({ code: 200, data: { studentId: 'ANNA_A1B2C3' } })
  })
  it.each([
    { classId: 'class-b', name: 'Anna', password: 'Anna' },
    { classId: 'class-a', name: 'Nobody', password: 'Anna' },
    { classId: 'class-a', name: 'Anna', password: 'wrong' }
  ])('does not reveal IDs for incorrect credentials', async body => {
    const result = await call('POST', body)
    expect(result.code).toBe(401)
    expect(result.data.studentId).toBeUndefined()
  })
  it('distinguishes identical names in different classes', async () => {
    pupil('ANNA_OTHER', 'Anna', 'class-b')
    expect(await call('POST', { classId: 'class-b', name: 'Anna', password: 'Anna' }))
      .toMatchObject({ code: 200, data: { studentId: 'ANNA_OTHER' } })
  })
  it('requires a pupil ID when names are identical within a class', async () => {
    pupil('ANNA_OTHER', 'Anna', 'class-a', 'different-password')
    const result = await call()
    expect(result.code).toBe(409)
    expect(result.data.error).toContain('elev-ID')
    expect(result.data.studentId).toBeUndefined()
    expect((await call('POST', { classId: 'class-a', name: 'Anna', password: 'wrong' })).code).toBe(401)
  })
  it('normalizes Swedish names and whitespace, but preserves password case', async () => {
    pupil('ASA_TEST', 'Åsa   Öberg', 'class-a', 'Åsa Öberg')
    expect(await call('POST', { classId: 'class-a', name: '  åsa öberg ', password: 'Åsa Öberg' }))
      .toMatchObject({ code: 200, data: { studentId: 'ASA_TEST' } })
    expect((await call('POST', { classId: 'class-a', name: 'åsa öberg', password: 'åsa öberg' })).code).toBe(401)
  })
  it('supports current group membership and rejects a former class', async () => {
    const profile = records.get('student:ANNA_A1B2C3')
    profile.classId = 'class-b'; profile.classIds = ['class-b']
    expect((await call()).code).toBe(401)
    expect((await call('POST', { classId: 'class-b', name: 'Anna', password: 'Anna' })).code).toBe(200)
    profile.classIds.push('class-a')
    expect((await call()).code).toBe(200)
  })
  it('excludes deleted classes and pupils even if stale records remain', async () => {
    records.set('student_deleted:ANNA_A1B2C3', {})
    expect((await call()).code).toBe(401)
    records.delete('student_deleted:ANNA_A1B2C3')
    records.set('class_deleted:class-a', {})
    expect((await call()).code).toBe(401)
    expect((await call('GET')).data.classes).toEqual([{ id: 'class-b', name: '6B', schoolId: '', schoolName: 'Skola ej angiven' }])
  })
  it('does not accept unsupported profiles or passwords', async () => {
    delete records.get('student:ANNA_A1B2C3').profileSchemaVersion
    expect((await call()).code).toBe(401)
  })
  it('validates input without changing stored pupil identities or history', async () => {
    const before = structuredClone(records)
    expect((await call('POST', { classId: 'class-a', name: '', password: 'Anna' })).code).toBe(400)
    expect((await call()).code).toBe(200)
    expect(records).toEqual(before)
  })
})

describe('school-scoped pupil login', () => {
  beforeEach(() => {
    records.set('schools:index', ['north', 'south'])
    records.set('school:north', { id: 'north', name: 'Norra skolan', createdBy: 'private' })
    records.set('school:south', { id: 'south', name: 'Södra skolan' })
    records.get('class:class-a').schoolId = 'north'
    Object.assign(records.get('class:class-b'), { schoolId: 'south', name: '6A' })
    pupil('ANNA_SOUTH', 'Anna', 'class-b')
  })
  it('keeps two schools with the same class and pupil names distinct', async () => {
    const directory = await call('GET')
    expect(directory.data.classes).toEqual([
      { id: 'class-a', name: '6A', schoolId: 'north', schoolName: 'Norra skolan' },
      { id: 'class-b', name: '6A', schoolId: 'south', schoolName: 'Södra skolan' }
    ])
    expect(await call('POST', { schoolId: 'north', classId: 'class-a', name: 'Anna', password: 'Anna' }))
      .toMatchObject({ code: 200, data: { studentId: 'ANNA_A1B2C3' } })
    expect(await call('POST', { schoolId: 'south', classId: 'class-b', name: 'Anna', password: 'Anna' }))
      .toMatchObject({ code: 200, data: { studentId: 'ANNA_SOUTH' } })
  })
  it('rejects a mismatched or omitted school', async () => {
    expect((await call()).code).toBe(401)
    expect((await call('POST', { schoolId: 'south', classId: 'class-a', name: 'Anna', password: 'Anna' })).code).toBe(401)
  })
  it('does not expose or authenticate classes linked to a missing school', async () => {
    records.delete('school:north')
    expect((await call('GET')).data.classes.map(item => item.id)).toEqual(['class-b'])
    expect((await call('POST', { schoolId: 'north', classId: 'class-a', name: 'Anna', password: 'Anna' })).code).toBe(401)
  })
})
