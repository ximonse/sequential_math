import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashTeacherPassword } from './_helpers.js'

const records = vi.hoisted(() => new Map())

function clone(value) {
  return value === undefined ? undefined : structuredClone(value)
}

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
      const next = JSON.parse(json)
      if (next.classIds?.some(classId => records.has(`class_deleted:${classId}`))) return -3
      records.set(key, next)
      index.add(id)
    }
    records.set(indexKey, [...index])
    return 1
  })
} }))

import schoolsHandler from './teacher-schools.js'
import classesHandler from './teacher-classes.js'
import teacherLoginHandler from './teacher-login.js'
import teachersHandler from './admin/teachers.js'
import teacherHandler from './admin/teachers/[id].js'
import rosterHandler from './student-roster.js'
import studentLoginHandler from './student-login.js'
import studentsHandler from './students.js'
import studentHandler from './student/[studentId].js'
import eventsHandler from './student/[studentId]/events.js'

function response() {
  return {
    code: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    status(code) { this.code = code; return this },
    json(data) { this.data = data; return this },
    end() { this.ended = true; return this }
  }
}

async function call(handler, { method = 'GET', headers = {}, body = {}, query = {} } = {}) {
  const res = response()
  await handler({ method, headers, body, query }, res)
  return res
}

describe('teacher account to pupil lifecycle', () => {
  beforeEach(() => {
    records.clear()
    process.env.TEACHER_API_PASSWORD = 'synthetic-flow-signing-secret'
    delete process.env.TEACHER_API_PASSWORD_ROTATION_SECRET
    const { hash, salt, scheme } = hashTeacherPassword('admin-secret')
    records.set('teacher_account:admin', {
      id: 'admin', username: 'admin', displayName: 'Admin',
      passwordHash: hash, passwordSalt: salt, passwordScheme: scheme,
      classIds: [], isAdmin: true, sessionVersion: 1
    })
    records.set('teacher_accounts:index', ['admin'])
  })

  it('uses real handlers for login, roster, details, sessions, practice, and deletion', async () => {
    const adminLogin = await call(teacherLoginHandler, {
      method: 'POST', body: { username: 'admin', password: 'admin-secret' }
    })
    expect(adminLogin).toMatchObject({ code: 200, data: { ok: true, isAdmin: true } })
    const adminHeaders = { 'x-teacher-token': adminLogin.data.token }

    const createdTeacher = await call(teachersHandler, {
      method: 'POST', headers: adminHeaders,
      body: { username: 'ada', displayName: 'Ada Teacher', password: 'first-secret' }
    })
    expect(createdTeacher.code).toBe(201)
    const teacherId = createdTeacher.data.teacher.id

    const firstLogin = await call(teacherLoginHandler, {
      method: 'POST', body: { username: 'ada', password: 'first-secret' }
    })
    expect(firstLogin).toMatchObject({ code: 200, data: { teacherId, isAdmin: false } })
    const firstTeacherHeaders = { 'x-teacher-token': firstLogin.data.token }

    const roster = await call(rosterHandler, {
      method: 'POST', headers: firstTeacherHeaders,
      body: { requestId: 'synthetic-flow-2026', className: '4A', grade: 4, names: ['Ada Student'] }
    })
    expect(roster).toMatchObject({ code: 200, data: { ok: true } })
    const studentId = roster.data.results[0].studentId

    const loginClasses = await call(studentLoginHandler)
    expect(loginClasses.code).toBe(405)
    const pupilLogin = await call(studentLoginHandler, {
      method: 'POST',
      body: { name: 'Ada Student', password: 'Ada Student' }
    })
    expect(pupilLogin).toMatchObject({ code: 200, data: { studentId, assignments: [{ classId: roster.data.class.id }] } })
    const pupilProfile = await call(studentHandler, {
      query: { studentId: pupilLogin.data.studentId }, headers: { 'x-student-password': 'Ada Student' }
    })
    expect(pupilProfile).toMatchObject({ code: 200, data: { profile: { studentId, name: 'Ada Student' } } })


    const listed = await call(studentsHandler, { headers: firstTeacherHeaders })
    expect(listed).toMatchObject({ code: 200 })
    expect(listed.data.profiles.map(profile => profile.studentId)).toContain(studentId)

    const detail = await call(studentHandler, {
      headers: firstTeacherHeaders, query: { studentId }
    })
    expect(detail).toMatchObject({ code: 200 })
    expect(detail.data.profile.auth.passwordHash).toBeUndefined()

    const ticket = await call(studentHandler, {
      method: 'PATCH', headers: firstTeacherHeaders, query: { studentId },
      body: { serverRevision: detail.data.profile.serverRevision,
        changes: { ticketInbox: { activeDispatchId: 'ticket-1', activePayload: { title: 'Öva addition' } } } }
    })
    expect(ticket.code).toBe(200)

    const practice = await call(eventsHandler, {
      method: 'POST', query: { studentId }, headers: { 'x-student-password': 'Ada Student' },
      body: { entries: [{ id: 'problem-1', type: 'problem_result', timestamp: Date.now(), payload: {
        problemId: 'addition-1', timestamp: Date.now(), correct: true, operation: 'addition',
        problemType: 'addition', difficulty: { conceptual_level: 1 }, studentAnswer: 2,
        correctAnswer: 2, timeSpent: 3, speedTimeSec: 3
      } }] }
    })
    expect(practice).toMatchObject({ code: 200, data: { appliedCount: 1 } })
    expect(records.get(`student:${studentId}`).problemLog).toHaveLength(1)

    const passwordChange = await call(teacherHandler, {
      method: 'PUT', headers: adminHeaders, query: { id: teacherId }, body: { password: 'second-secret' }
    })
    expect(passwordChange).toMatchObject({ code: 200, data: { ok: true } })
    expect((await call(studentsHandler, { headers: firstTeacherHeaders })).code).toBe(401)
    expect((await call(teacherLoginHandler, {
      method: 'POST', body: { username: 'ada', password: 'first-secret' }
    })).code).toBe(401)

    const secondLogin = await call(teacherLoginHandler, {
      method: 'POST', body: { username: 'ada', password: 'second-secret' }
    })
    expect(secondLogin.code).toBe(200)
    const deleteStudent = await call(studentHandler, {
      method: 'DELETE', headers: { 'x-teacher-token': secondLogin.data.token }, query: { studentId }
    })
    expect(deleteStudent).toMatchObject({ code: 200, data: { ok: true, deleted: true } })
    expect((await call(studentHandler, {
      query: { studentId }, headers: { 'x-teacher-token': secondLogin.data.token }
    })).code).toBe(410)
  })
})

describe('school management lifecycle', () => {
  beforeEach(() => {
    records.clear()
    process.env.TEACHER_API_PASSWORD = 'synthetic-flow-signing-secret'
    delete process.env.TEACHER_API_PASSWORD_ROTATION_SECRET
    const { hash, salt, scheme } = hashTeacherPassword('school-secret')
    records.set('teacher_account:school-teacher', {
      id: 'school-teacher', username: 'school-teacher', passwordHash: hash, passwordSalt: salt,
      passwordScheme: scheme, classIds: [], isAdmin: false, sessionVersion: 1
    })
    records.set('teacher_accounts:index', ['school-teacher'])
  })
  async function headers() {
    const login = await call(teacherLoginHandler, { method: 'POST', body: { username: 'school-teacher', password: 'school-secret' } })
    expect(login.code).toBe(200)
    return { 'x-teacher-token': login.data.token }
  }
  it('requires a live teacher and validates school names', async () => {
    expect((await call(schoolsHandler, { method: 'POST', body: { name: 'Skolan' } })).code).toBe(401)
    const auth = await headers()
    expect((await call(schoolsHandler, { method: 'POST', headers: auth, body: { name: ' ' } })).code).toBe(400)
    expect((await call(schoolsHandler, { method: 'POST', headers: auth, body: { name: 'x'.repeat(101) } })).code).toBe(400)
    expect(records.has('schools:index')).toBe(false)
  })
  it('creates schools, enrolls in a school, and reassigns a legacy class without rewriting pupils', async () => {
    const auth = await headers()
    const school = await call(schoolsHandler, { method: 'POST', headers: auth, body: { name: ' Norra skolan ' } })
    expect(school.code).toBe(201)
    expect((await call(schoolsHandler, { headers: auth })).data.schools).toEqual([school.data.school])
    expect(school.data.school.name).toBe('Norra skolan')
    const schoolId = school.data.school.id
    const rosterBody = { requestId: 'school-flow-request-1', className: '6A', names: ['Anna'], schoolId }
    const roster = await call(rosterHandler, { method: 'POST', headers: auth, body: rosterBody })
    expect(roster).toMatchObject({ code: 200, data: { ok: true, class: { schoolId } } })
    const studentId = roster.data.results[0].studentId
    const replay = await call(rosterHandler, { method: 'POST', headers: auth, body: rosterBody })
    expect(replay.data.results[0].studentId).toBe(studentId)
    const changedRetry = await call(rosterHandler, { method: 'POST', headers: auth, body: { ...rosterBody, schoolId: '' } })
    expect(changedRetry.code).toBe(409)
    expect(await call(studentLoginHandler, { method: 'POST', body: { name: 'Anna', password: 'Anna' } }))
      .toMatchObject({ code: 200, data: { studentId } })
    const before = structuredClone(records.get('student:' + studentId))
    const reassigned = await call(classesHandler, { method: 'PUT', headers: auth, body: { id: roster.data.class.id, name: '6A', schoolId: '' } })
    expect(reassigned.code).toBe(200)
    expect(records.get('student:' + studentId)).toEqual(before)
    const linked = await call(classesHandler, { method: 'PUT', headers: auth, body: { id: roster.data.class.id, name: '6A', schoolId } })
    expect(linked.code).toBe(200)
    expect(records.get('student:' + studentId)).toEqual(before)
    const invalid = await call(classesHandler, { method: 'PUT', headers: auth, body: { id: roster.data.class.id, name: '6A', schoolId: 'missing' } })
    expect(invalid.code).toBe(400)
    expect(records.get('class:' + roster.data.class.id).schoolId).toBe(schoolId)
  })
  it('does not grant access to another teachers classes through a shared school', async () => {
    const auth = await headers()
    const school = await call(schoolsHandler, { method: 'POST', headers: auth, body: { name: 'Skolan' } })
    const schoolId = school.data.school.id
    records.set('class:private-class', { id: 'private-class', name: '6A', schoolId, teacherIds: ['someone-else'] })
    records.set('classes:index', ['private-class'])
    expect((await call(classesHandler, { headers: auth })).data.classes).toEqual([])
    expect((await call(classesHandler, { method: 'PUT', headers: auth, body: { id: 'private-class', name: '6B', schoolId } })).code).toBe(403)
    expect((await call(rosterHandler, { method: 'POST', headers: auth, body: { requestId: 'school-access-check', classId: 'private-class', names: ['Anna'], schoolId } })).code).toBe(403)
  })
})
