import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  set: vi.fn(async (key, value) => records.set(key, structuredClone(value)))
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
})
