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

import handler from './teacher-workspace.js'

async function call(method, auth, body = {}) {
  const res = {
    code: 200,
    status(code) { this.code = code; return this },
    json(data) { this.data = data; return this },
    end() { return this }
  }
  await handler({ method, auth, body, headers: {} }, res)
  return res
}

describe('teacher workspace persistence', () => {
  beforeEach(() => records.clear())

  it('stores assignments and tickets per authenticated teacher', async () => {
    const auth = { teacherId: 'teacher-a' }
    const saved = await call('PUT', auth, {
      assignments: [{ id: 'a1', title: 'Addition' }],
      activeAssignmentId: 'a1',
      ticketTemplates: [{ id: 't1', question: '2+2?', answer: '4' }],
      ticketDispatches: [{ id: 'd1', ticketId: 't1' }]
    })
    expect(saved).toMatchObject({ code: 200, data: { ok: true, workspace: { teacherId: 'teacher-a' } } })
    expect((await call('GET', auth)).data.workspace).toMatchObject({
      activeAssignmentId: 'a1',
      assignments: [{ id: 'a1' }],
      ticketTemplates: [{ id: 't1' }],
      ticketDispatches: [{ id: 'd1' }]
    })
    expect((await call('GET', { teacherId: 'teacher-b' })).data.workspace).toBeNull()
  })

  it('requires live authentication and rejects oversized lists', async () => {
    expect((await call('GET', null)).code).toBe(401)
    expect((await call('PUT', { teacherId: 'teacher-a' }, {
      assignments: Array.from({ length: 501 }, (_, index) => ({ id: String(index) }))
    })).code).toBe(400)
  })
})
