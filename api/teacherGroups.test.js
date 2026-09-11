import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
const clone = value => value === undefined ? undefined : structuredClone(value)

vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => clone(records.get(key) ?? null)),
  exists: vi.fn(async key => records.has(key) ? 1 : 0),
  set: vi.fn(async (key, value) => records.set(key, clone(value))),
  del: vi.fn(async key => records.delete(key)),
  smembers: vi.fn(async key => [...(records.get(key) || [])]),
  sadd: vi.fn(async (key, ...values) => {
    const members = new Set(records.get(key) || [])
    values.forEach(value => members.add(value))
    records.set(key, [...members])
  }),
  srem: vi.fn(async (key, ...values) => {
    const members = new Set(records.get(key) || [])
    values.forEach(value => members.delete(value))
    records.set(key, [...members])
  }),
  eval: vi.fn(async (_script, keys, args) => {
    const [key, deletedKey, indexKey] = keys
    const [expected, operation, json, id] = args
    if (records.has(deletedKey)) return -2
    const current = records.get(key)
    if ((current ? Number(current.serverRevision) || 0 : -1) !== Number(expected)) return 0
    const index = new Set(records.get(indexKey) || [])
    if (operation === 'delete') {
      records.set(deletedKey, json)
      records.delete(key)
      index.delete(id)
    } else {
      records.set(key, JSON.parse(json))
      index.add(id)
    }
    records.set(indexKey, [...index])
    return 1
  })
} }))

import { createTeacherSessionToken } from './_helpers.js'
import groupsHandler from './teacher-groups.js'
import membershipHandler from './student/[studentId]/class-membership.js'

function response() {
  return {
    code: 200,
    setHeader() {},
    status(code) { this.code = code; return this },
    json(data) { this.data = data; return this },
    end() { return this }
  }
}

async function call(handler, { method = 'GET', token = '', body = {}, query = {} } = {}) {
  const res = response()
  await handler({ method, headers: token ? { 'x-teacher-token': token } : {}, body, query }, res)
  return res
}

function tokenFor(id) {
  return createTeacherSessionToken({
    teacherId: id,
    classIds: records.get(`teacher_account:${id}`)?.classIds || [],
    role: records.get(`teacher_account:${id}`)?.role,
    sessionVersion: 1
  }).token
}

describe('teacher groups', () => {
  beforeEach(() => {
    records.clear()
    process.env.TEACHER_API_PASSWORD = 'teacher-groups-test-secret'
    const teachers = [
      { id: 'one', displayName: 'One', role: 'teacher', schoolIds: ['school'], classIds: ['a'], sessionVersion: 1 },
      { id: 'two', displayName: 'Two', role: 'teacher', schoolIds: ['school'], classIds: ['a'], sessionVersion: 1 },
      { id: 'three', displayName: 'Three', role: 'teacher', schoolIds: ['school'], classIds: ['b'], sessionVersion: 1 }
    ]
    teachers.forEach(account => records.set(`teacher_account:${account.id}`, account))
    records.set('teacher_accounts:index', teachers.map(account => account.id))
    records.set('class:a', { id: 'a', name: '6A', schoolId: 'school', teacherIds: ['one', 'two'] })
    records.set('class:b', { id: 'b', name: '6B', schoolId: 'school', teacherIds: ['one', 'three'] })
    records.set('classes:index', ['a', 'b'])
    records.set('student:PUPIL', { studentId: 'PUPIL', name: 'Pupil', classId: 'a', classIds: ['a'], serverRevision: 0 })
    records.set('students:index', ['PUPIL'])
  })

  it('creates and shares a group only with teachers who can access every pupil', async () => {
    const created = await call(groupsHandler, {
      method: 'POST',
      token: tokenFor('one'),
      body: { name: ' Stödgrupp ', pupilIds: ['PUPIL'], teacherIds: ['two'] }
    })
    expect(created).toMatchObject({ code: 201, data: { group: {
      name: 'Stödgrupp', schoolId: 'school', pupilIds: ['PUPIL'], teacherIds: ['two', 'one']
    } } })
    expect((await call(groupsHandler, { token: tokenFor('two') })).data.groups).toHaveLength(1)
    expect((await call(groupsHandler, { token: tokenFor('three') })).data.groups).toEqual([])

    const denied = await call(groupsHandler, {
      method: 'PUT',
      token: tokenFor('one'),
      body: { id: created.data.group.id, teacherIds: ['three'], pupilIds: ['PUPIL'] }
    })
    expect(denied.code).toBe(403)
  })

  it('removes a moved pupil when a shared teacher no longer has access', async () => {
    const created = await call(groupsHandler, {
      method: 'POST',
      token: tokenFor('one'),
      body: { name: 'Shared', pupilIds: ['PUPIL'], teacherIds: ['two'] }
    })
    const moved = await call(membershipHandler, {
      method: 'PUT',
      token: tokenFor('one'),
      query: { studentId: 'PUPIL' },
      body: { fromClassId: 'a', toClassId: 'b' }
    })
    expect(moved.code).toBe(200)
    expect(records.get(`group:${created.data.group.id}`).pupilIds).toEqual([])
  })

  it('rejects cross-school groups and unauthorized deletion', async () => {
    records.set('class:foreign', { id: 'foreign', name: '6C', schoolId: 'other', teacherIds: ['one'] })
    records.set('student:FOREIGN', { studentId: 'FOREIGN', classId: 'foreign', classIds: ['foreign'] })
    records.set('students:index', ['PUPIL', 'FOREIGN'])
    const denied = await call(groupsHandler, {
      method: 'POST',
      token: tokenFor('one'),
      body: { name: 'Mixed', pupilIds: ['PUPIL', 'FOREIGN'] }
    })
    expect(denied.code).toBe(400)

    const created = await call(groupsHandler, {
      method: 'POST',
      token: tokenFor('one'),
      body: { name: 'Private', pupilIds: ['PUPIL'] }
    })
    expect((await call(groupsHandler, {
      method: 'DELETE', token: tokenFor('three'), body: { id: created.data.group.id }
    })).code).toBe(403)
    expect((await call(groupsHandler, {
      method: 'DELETE', token: tokenFor('one'), body: { id: created.data.group.id }
    })).code).toBe(200)
  })
})
