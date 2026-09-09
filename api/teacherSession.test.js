import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null))
} }))

import { createTeacherSessionToken, getLiveTeacherAuthPayload } from './_helpers.js'

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
})
