import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

const memory = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(memory.get(key) ?? null)),
  exists: vi.fn(async key => memory.has(key) ? 1 : 0),
  smembers: vi.fn(async key => [...(memory.get(key) || [])]),
  set: vi.fn(async (key, value) => memory.set(key, structuredClone(value))),
  del: vi.fn(async key => memory.delete(key)),
  eval: vi.fn(async (_script, keys, args) => {
    // Atomic fake Redis boundary; conflict/retry behavior runs in real handlers.
    const [key, deletedKey, indexKey] = keys
    const [expected, operation, json, id] = args
    if (memory.has(deletedKey)) return -2
    const current = memory.get(key)
    const version = current ? Number(current.serverRevision) || 0 : -1
    if (version !== Number(expected)) return 0
    const index = new Set(memory.get(indexKey) || [])
    if (operation === 'delete') {
      memory.set(deletedKey, json)
      memory.delete(key)
      index.delete(id)
    } else {
      const next = JSON.parse(json)
      if (next.classIds?.some(classId => memory.has(`class_deleted:${classId}`))) return -3
      memory.set(key, next)
      index.add(id)
    }
    memory.set(indexKey, [...index])
    return 1
  })
} }))
vi.mock('./_helpers.js', () => ({
  getTeacherAuthPayload: req => req.teacher || null,
  getLiveTeacherAuthPayload: async req => req.teacher || null,
  isTeacherApiAuthorized: req => Boolean(req.teacher),
  isLiveTeacherApiAuthorized: async req => Boolean(req.teacher),
  isLiveAdminAuthorized: async req => Boolean(req.teacher?.isAdmin),
  secureCompare: (a, b) => a === b,
  withCors: () => {}
}))

import studentHandler from './student/[studentId].js'
import eventsHandler from './student/[studentId]/events.js'
import rosterHandler from './student-roster.js'
import teacherClassesHandler from './teacher-classes.js'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { sanitizeProfileForList } from './students.js'
import { isTeacherListProfile } from '../src/lib/teacherListProfile.js'
import { createStudentRecord, mutateStudentRecord } from './_studentStore.js'
import { createClassRecord, deleteClassRecord } from './_classStore.js'
import { createStudentProfile } from '../src/lib/studentProfile.js'

const admin = { isAdmin: true }
const owner = { teacherId: 'owner', isAdmin: false, classIds: [], schoolIds: ['S'] }
function profile() {
  return {
    ...createStudentProfile('PUPIL', 'Same name', 4),
    classId: 'A', classIds: ['A'], className: '4a',
    auth: { passwordScheme: 'sha256-v1', passwordSalt: 'salt',
      passwordHash: createHash('sha256').update('salt:pw').digest('hex'), passwordUpdatedAt: 1 }
  }
}
function result(id) {
  return { problemId: id, timestamp: Date.now(), correct: true,
    operation: 'addition', problemType: 'addition', difficulty: { conceptual_level: 1 },
    studentAnswer: 2, correctAnswer: 2, timeSpent: 2, speedTimeSec: 2 }
}
async function call(handler, method, body = {}, teacher = admin) {
  const requestBody = body?.className && !body?.schoolId ? { ...body, schoolId: 'S' } : body
  const req = { method, query: { studentId: 'PUPIL' },
    headers: { 'x-student-password': 'pw' }, body: requestBody, teacher }
  const res = { code: 200, status(code) { this.code = code; return this },
    json(data) { this.data = data; return this } }
  await handler(req, res)
  return res
}
async function callClass(method, id, teacher = owner, body = {}) {
  const req = { method, query: { id }, headers: {}, body, teacher }
  const res = { code: 200, status(code) { this.code = code; return this },
    json(data) { this.data = data; return this } }
  await teacherClassesHandler(req, res)
  return res
}
beforeEach(async () => {
  memory.clear()
  memory.set('school:S', { id: 'S', name: 'Skolan' })
  memory.set('schools:index', ['S'])
  await createClassRecord({ id: 'A', name: '4a', schoolId: 'S', teacherIds: ['owner'] })
  await createStudentRecord('PUPIL', profile())
})

describe('student persistence boundary', () => {
  it('renames a pupil and class without changing their identities or history', async () => {
    const pupil = await call(studentHandler, 'PATCH', { serverRevision: 0, changes: { name: 'New name' } }, owner)
    expect(pupil.code).toBe(200)
    expect(memory.get('student:PUPIL')).toMatchObject({ studentId: 'PUPIL', name: 'New name', classIds: ['A'] })
    const klass = await callClass('PUT', 'A', owner, { id: 'A', name: '4B' })
    expect(klass).toMatchObject({ code: 200, data: { ok: true } })
    expect(memory.get('class:A')).toMatchObject({ id: 'A', name: '4B' })
  })
  it('creates distinct same-name pupils and safely retries a concurrent roster submission', async () => {
    const body = { requestId: 'synthetic-request-1234', className: 'Test class', names: ['Karl', 'Karin', 'Lo A'] }
    const responses = await Promise.all([
      call(rosterHandler, 'POST', body, owner), call(rosterHandler, 'POST', body, owner)
    ])
    expect(responses.map(res => res.data.ok)).toEqual([true, true])
    const ids = responses[0].data.results.map(row => row.studentId)
    expect(new Set(ids).size).toBe(3)
    expect(responses[1].data.results.map(row => row.studentId)).toEqual(ids)
    expect(memory.get('students:index')).toHaveLength(4)
    for (const id of ids) expect(isCurrentStudentProfile(memory.get(`student:${id}`))).toBe(true)
    expect((await call(rosterHandler, 'POST', body, owner)).data.ok).toBe(true)
    expect(memory.get('students:index')).toHaveLength(4)
  })

  it('never reuses a same-name pupil when creating another class', async () => {
    const body = { requestId: 'synthetic-request-1234', className: 'First', names: ['Karl'] }
    const first = await call(rosterHandler, 'POST', body, owner)
    const second = await call(rosterHandler, 'POST', { ...body, requestId: 'synthetic-request-5678', className: 'Second' }, owner)
    expect(first.data.results[0].studentId).not.toBe(second.data.results[0].studentId)
  })

  it('adds existing identity to a group only by explicit ID and live source ownership', async () => {
    const body = { requestId: 'synthetic-request-1234', className: 'Group', existingStudentIds: ['PUPIL'] }
    const added = await call(rosterHandler, 'POST', body, owner)
    expect(added.data.ok).toBe(true)
    expect(memory.get('student:PUPIL').classIds).toContain(added.data.class.id)
    const denied = await call(rosterHandler, 'POST', { ...body, requestId: 'synthetic-request-5678' }, { teacherId: 'stranger' })
    expect(denied.code).toBe(403)
    expect(memory.get('student:PUPIL').classIds).not.toContain(denied.data.class?.id)
  })

  it('rejects list summaries as writable profiles and omits credentials from the list', async () => {
    const dto = sanitizeProfileForList(memory.get('student:PUPIL'))
    expect(isTeacherListProfile(dto)).toBe(true)
    expect(dto.problemLog).toBeUndefined()
    expect(dto.auth.passwordHash).toBeUndefined()
    expect((await call(studentHandler, 'POST', { profile: dto })).code).toBe(400)
  })

  it('acknowledges teacher patches only at the expected revision and preserves training', async () => {
    const request = { serverRevision: 0, changes: { ticketInbox: { activeDispatchId: 'new' } } }
    expect((await call(studentHandler, 'PATCH', request, owner)).code).toBe(200)
    expect((await call(studentHandler, 'PATCH', request, owner)).code).toBe(409)
    expect((await call(studentHandler, 'PATCH', request, null)).code).toBe(401)
    expect((await call(studentHandler, 'PATCH', { serverRevision: 1, changes: { problemLog: [] } }, owner)).code).toBe(400)
    expect(memory.get('student:PUPIL').ticketInbox.activeDispatchId).toBe('new')
  })

  it('does not acknowledge an invalid event batch', async () => {
    const response = await call(eventsHandler, 'POST', { entries: [{ id: 'invalid', type: 'problem_result', payload: {} }] })
    expect(response.code).toBe(400)
    expect(response.data.ack).toBeUndefined()
  })
  it('retains both concurrent full-profile updates', async () => {
    const base = profile()
    const first = result('first'), second = result('second')
    const responses = await Promise.all([
      call(studentHandler, 'POST', { profile: { ...base, recentProblems: [first], problemLog: [first] } }),
      call(studentHandler, 'POST', { profile: { ...base, recentProblems: [second], problemLog: [second] } })
    ])
    expect(responses.map(res => res.code)).toEqual([200, 200])
    expect(memory.get('student:PUPIL').problemLog.map(p => p.problemId).sort()).toEqual(['first', 'second'])
    expect(memory.get('student:PUPIL').serverRevision).toBe(2)
  })

  it('retains a simultaneous event and full-profile upload without duplicates', async () => {
    const first = result('first'), second = result('second')
    const batch = { entries: [{ id: 'event-1', type: 'problem_result', timestamp: first.timestamp, payload: first }] }
    await Promise.all([
      call(eventsHandler, 'POST', batch),
      call(studentHandler, 'POST', { profile: { ...profile(), recentProblems: [second], problemLog: [second] } })
    ])
    expect((await call(eventsHandler, 'POST', batch)).data.appliedCount).toBe(0)
    expect(memory.get('student:PUPIL').problemLog).toHaveLength(2)
  })

  it('does not count a repeated table completion twice', async () => {
    const batch = { entries: [{ id: 'table-1', type: 'table_completed', timestamp: 1234, payload: { table: 3 } }] }
    expect((await call(eventsHandler, 'POST', batch)).data.appliedCount).toBe(1)
    expect((await call(eventsHandler, 'POST', batch)).data.appliedCount).toBe(0)
    expect(memory.get('student:PUPIL').tableDrill.completions).toHaveLength(1)
  })

  it('uses live ownership and rejects another teacher for GET, POST, DELETE and events', async () => {
    expect((await call(studentHandler, 'GET', {}, owner)).code).toBe(200)
    const stranger = { teacherId: 'stranger', classIds: ['A'], isAdmin: false }
    for (const method of ['GET', 'POST', 'DELETE']) {
      expect((await call(studentHandler, method, { profile: profile() }, stranger)).code).toBe(403)
    }
    expect((await call(eventsHandler, 'POST', { entries: [{ id: 'e', type: 'problem_result', payload: result('e') }] }, stranger)).code).toBe(403)
  })

  it('removes a deleted pupil from indexed and current-class highscores', async () => {
    memory.set('highscores:pong:A', [
      { studentId: 'PUPIL', name: 'Same name', score: 100 },
      { studentId: 'OTHER', name: 'Other', score: 90 }
    ])
    memory.set('highscores:snake:old-group', [
      { studentId: 'PUPIL', name: 'Same name', score: 80 }
    ])
    memory.set('student_highscore_keys:PUPIL', [
      'highscores:pong:A',
      'highscores:snake:old-group'
    ])

    const response = await call(studentHandler, 'DELETE', {}, owner)

    expect(response).toMatchObject({ code: 200, data: { ok: true, highscoreCleanup: 'complete' } })
    expect(memory.get('highscores:pong:A')).toEqual([
      { studentId: 'OTHER', name: 'Other', score: 90 }
    ])
    expect(memory.get('highscores:snake:old-group')).toEqual([])
    expect(memory.has('student_highscore_keys:PUPIL')).toBe(false)
  })

  it('prevents stale snapshots from restoring identity, class membership or teacher instructions', async () => {
    const incoming = { ...profile(), name: 'Changed', classId: 'B', classIds: ['B'], ticketInbox: { activePayload: {} } }
    expect((await call(studentHandler, 'POST', { profile: incoming }, null)).code).toBe(200)
    const stored = memory.get('student:PUPIL')
    expect(stored.name).toBe('Same name')
    expect(stored.classIds).toEqual(['A'])
    expect(stored.ticketInbox).toBeUndefined()
  })

  it('never recreates a deleted pupil through a stale upload or enrollment', async () => {
    expect((await call(studentHandler, 'DELETE')).code).toBe(200)
    expect((await call(studentHandler, 'POST', { profile: profile() })).code).toBe(410)
    await expect(createStudentRecord('PUPIL', profile())).rejects.toMatchObject({ status: 410 })
    expect(memory.has('student:PUPIL')).toBe(false)
    expect(memory.get('students:index')).toEqual([])
  })

  it('does not restore a removed class from an older training snapshot', async () => {
    const old = profile()
    await deleteClassRecord('A')
    expect(memory.get('student:PUPIL').classIds).toEqual([])
    expect((await call(studentHandler, 'POST', { profile: old }, null)).code).toBe(200)
    expect(memory.get('student:PUPIL').classIds).toEqual([])
    await expect(createClassRecord({ id: 'A', name: 'Old class' })).rejects.toMatchObject({ status: 410 })
  })

  it('lets the same class owner resume deletion after the class tombstone exists', async () => {
    const originalDelete = memory.get.bind(memory)
    let interruptOnce = true
    memory.get = key => {
      if (key === 'student:PUPIL' && interruptOnce) {
        interruptOnce = false
        throw new Error('Synthetic interruption')
      }
      return originalDelete(key)
    }
    expect((await callClass('DELETE', 'A', owner)).code).toBe(500)
    expect(memory.has('class_deleted:A')).toBe(true)
    expect(memory.get('class_deletion:A').teacherIds).toEqual(['owner'])
    memory.get = originalDelete
    expect((await callClass('DELETE', 'A', owner)).code).toBe(200)
    expect(memory.get('student:PUPIL').classIds).toEqual([])
    expect((await callClass('DELETE', 'A', { teacherId: 'stranger', isAdmin: false })).code).toBe(403)
  })

  it('does not let a concurrent write win over deletion', async () => {
    await Promise.allSettled([
      mutateStudentRecord('PUPIL', async current => ({ ...current, name: 'Old snapshot' })),
      mutateStudentRecord('PUPIL', () => null)
    ])
    expect(memory.has('student:PUPIL')).toBe(false)
    expect(memory.has('student_deleted:PUPIL')).toBe(true)
  })
})
