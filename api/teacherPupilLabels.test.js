import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  set: vi.fn(async (key, value) => records.set(key, structuredClone(value))),
  smembers: vi.fn(async key => structuredClone(records.get(key) ?? []))
} }))
vi.mock('./_helpers.js', () => ({
  getLiveTeacherAuthPayload: vi.fn(async req => req.auth || null),
  withCors: vi.fn()
}))
vi.mock('./_studentAccess.js', () => ({
  assertTeacherStudentAccess: vi.fn(async (req, profile) => {
    if (!profile || !profile.allowedTeacherIds?.includes(req.auth?.teacherId)) {
      throw Object.assign(new Error('Not authorized for this student'), { status: 403 })
    }
  })
}))

import handler from './teacher-pupil-labels.js'

async function call(method, auth, body = {}) {
  const res = { code: 200, status(code) { this.code = code; return this }, json(data) { this.data = data; return this }, end() { return this } }
  await handler({ method, auth, body, headers: {} }, res)
  return res
}

describe('teacher pupil labels', () => {
  beforeEach(() => {
    records.clear()
    records.set('student:PUPIL-1', { allowedTeacherIds: ['teacher-a'] })
  })

  it('stores a label privately per teacher after checking pupil access', async () => {
    const saved = await call('PUT', { teacherId: 'teacher-a' }, { studentId: 'PUPIL-1', label: 'Alex' })
    expect(saved).toMatchObject({ code: 200, data: { ok: true, labels: { 'PUPIL-1': 'Alex' } } })
    expect((await call('GET', { teacherId: 'teacher-b' })).data.labels).toEqual({})
  })

  it('rejects a label for a pupil outside the teacher scope', async () => {
    expect((await call('PUT', { teacherId: 'teacher-b' }, { studentId: 'PUPIL-1', label: 'Alex' })).code).toBe(403)
  })

  it('fyller tomma etiketter från skapandenamnen inom lärarens räckvidd', async () => {
    records.set('students:index', ['PUPIL-1', 'PUPIL-2'])
    records.set('student:PUPIL-1', { allowedTeacherIds: ['teacher-a'], preferredName: 'Alva', displayAlias: 'Blå Räv' })
    records.set('student:PUPIL-2', { allowedTeacherIds: ['teacher-b'], preferredName: 'Bo', displayAlias: 'Gul Fyr' })

    const filled = await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names' })

    expect(filled).toMatchObject({ code: 200, data: { ok: true, added: 1, labels: { 'PUPIL-1': 'Alva' } } })
    expect(filled.data.labels['PUPIL-2']).toBeUndefined()
  })

  it('skriver inte över ett tilltalsnamn läraren redan valt', async () => {
    records.set('students:index', ['PUPIL-1'])
    records.set('student:PUPIL-1', { allowedTeacherIds: ['teacher-a'], preferredName: 'Alva', displayAlias: 'Blå Räv' })
    await call('PUT', { teacherId: 'teacher-a' }, { studentId: 'PUPIL-1', label: 'Alva S' })

    const filled = await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names' })

    expect(filled.data).toMatchObject({ added: 0, labels: { 'PUPIL-1': 'Alva S' } })
  })

  it('avvisar en okänd åtgärd', async () => {
    expect((await call('POST', { teacherId: 'teacher-a' }, { action: 'annat' })).code).toBe(400)
  })
})
