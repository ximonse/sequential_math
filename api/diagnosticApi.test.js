import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({ teacher: vi.fn(), classAccess: vi.fn(), create: vi.fn(),
  pupil: vi.fn(), origin: vi.fn(), csrf: vi.fn(), open: vi.fn(), read: vi.fn(),
  append: vi.fn(), pupilAccess: vi.fn(), listClass: vi.fn(), listPupil: vi.fn(), testStudents: vi.fn() }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: mocked.teacher, withCors: vi.fn() }))
vi.mock('./_studentAccess.js', () => ({ canAccessClass: mocked.classAccess }))
vi.mock('./_studentSession.js', () => ({ getLiveStudentSession: mocked.pupil,
  requestOriginIsTrusted: mocked.origin, hasStudentCsrf: mocked.csrf }))
vi.mock('./_diagnosticAssignmentStore.js', () => ({ createDiagnosticAssignment: mocked.create,
  openDiagnosticAttempt: mocked.open }))
vi.mock('./_diagnosticAttemptStore.js', () => ({ readDiagnosticAttempt: mocked.read,
  appendDiagnosticAttempt: mocked.append }))
vi.mock('./_diagnosticApiAccess.js', () => ({ diagnosticApiEnabled: () => process.env.NCM_DIAGNOSTIC_API_ENABLED === 'true',
  diagnosticTestStudentAllowed: studentId => studentId === 'PUPIL', diagnosticAssignablePupilsInClass: mocked.testStudents,
  assertDiagnosticPupilAccess: mocked.pupilAccess }))
vi.mock('./_diagnosticAssignmentList.js', () => ({ listClassDiagnosticAssignments: mocked.listClass,
  listPupilDiagnosticAssignments: mocked.listPupil }))

import teacherHandler from './teacher-diagnostic-assignments.js'
import pupilHandler from './me/diagnostic-attempt.js'
import pupilAssignmentsHandler from './me/diagnostic-assignments.js'

const response = () => ({ code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value },
  status(code) { this.code = code; return this }, json(data) { this.data = data; return this },
  end() { return this } })
const attempt = { record: { attemptId: 'ATTEMPT', studentId: 'PUPIL', assignmentId: 'ASSIGNMENT',
  assignmentItemId: 'ITEM', classIdAtAttempt: 'CLASS', evidenceClass: 'diagnostic_only' },
snapshot: { events: [] } }

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.NCM_DIAGNOSTIC_API_ENABLED
  mocked.teacher.mockResolvedValue({ teacherId: 'TEACHER', role: 'school_admin' })
  mocked.classAccess.mockResolvedValue(true)
  mocked.create.mockResolvedValue({ assignmentId: 'ASSIGNMENT' })
  mocked.pupil.mockResolvedValue({ profile: { studentId: 'PUPIL', classIds: ['CLASS'] }, session: {} })
  mocked.origin.mockReturnValue(true)
  mocked.csrf.mockReturnValue(true)
  mocked.open.mockResolvedValue({ kind: 'created', ...attempt })
  mocked.read.mockResolvedValue(attempt)
  mocked.append.mockResolvedValue({ kind: 'append', ack: ['ATTEMPT:1'], serverRevision: 1 })
  mocked.listClass.mockResolvedValue([{ assignmentId: 'ASSIGNMENT' }])
  mocked.listPupil.mockResolvedValue([{ assignmentId: 'ASSIGNMENT', items: [] }])
  mocked.testStudents.mockResolvedValue(['PUPIL'])
})

describe('diagnostic pilot API boundary', () => {
  it('uses the current server roster for a whole-class assignment instead of client pupil ids', async () => {
    process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
    mocked.testStudents.mockResolvedValue(['PUPIL', 'SECOND'])
    const res = response()
    await teacherHandler({ method: 'POST', headers: {}, body: { classId: 'CLASS',
      audience: 'class', studentIds: ['FOREIGN'], taskIds: ['add-no-carry-001'] } }, res)
    expect(res.code).toBe(201)
    expect(mocked.create).toHaveBeenCalledWith(expect.objectContaining({ studentIds: ['PUPIL', 'SECOND'] }))
  })
  it('rejects the whole class if the server test restriction excludes a member', async () => {
    process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
    mocked.testStudents.mockResolvedValueOnce(['PUPIL']).mockResolvedValueOnce(['PUPIL', 'SECOND'])
    const res = response()
    await teacherHandler({ method: 'POST', headers: {}, body: { classId: 'CLASS', audience: 'class',
      taskIds: ['add-no-carry-001'] } }, res)
    expect(res.code).toBe(403)
    expect(mocked.create).not.toHaveBeenCalled()
  })
  it('is closed by default before pupil deletion and archive integration', async () => {
    const teacher = response(), pupil = response()
    await teacherHandler({ method: 'POST', headers: {}, body: {} }, teacher)
    await pupilHandler({ method: 'POST', headers: {}, body: { action: 'open' } }, pupil)
    expect([teacher.code, pupil.code]).toEqual([404, 404])
    expect(mocked.create).not.toHaveBeenCalled()
    expect(mocked.open).not.toHaveBeenCalled()
  })

  it('requires a live teacher and current class access before creating', async () => {
    process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
    mocked.teacher.mockResolvedValueOnce(null)
    const noSession = response()
    await teacherHandler({ method: 'POST', headers: {}, body: { classId: 'CLASS' } }, noSession)
    expect(noSession.code).toBe(401)
    mocked.classAccess.mockResolvedValueOnce(false)
    const noClass = response()
    await teacherHandler({ method: 'POST', headers: {}, body: { classId: 'CLASS' } }, noClass)
    expect(noClass.code).toBe(403)
    expect(mocked.create).not.toHaveBeenCalled()
    const realPupil = response()
    await teacherHandler({ method: 'POST', headers: {}, body: { classId: 'CLASS',
      studentIds: ['REAL-PUPIL'], taskIds: ['add-no-carry-001'] } }, realPupil)
    expect(realPupil.code).toBe(403)
    const created = response()
    await teacherHandler({ method: 'POST', headers: {}, body: { classId: 'CLASS', studentIds: ['PUPIL'],
      taskIds: ['add-no-carry-001'] } }, created)
    expect(created.code).toBe(201)
    expect(mocked.create).toHaveBeenCalledWith({ classId: 'CLASS', studentIds: ['PUPIL'],
      taskIds: ['add-no-carry-001'], teacherId: 'TEACHER' })
  })

  it('does not let a regular teacher call the hidden NCM pilot API', async () => {
    process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
    mocked.teacher.mockResolvedValue({ teacherId: 'TEACHER', role: 'teacher' })
    const listed = response(), created = response()
    await teacherHandler({ method: 'GET', headers: {}, query: { classId: 'CLASS' } }, listed)
    await teacherHandler({ method: 'POST', headers: {}, body: { classId: 'CLASS',
      studentIds: ['PUPIL'], taskIds: ['add-no-carry-001'] } }, created)
    expect([listed.code, created.code]).toEqual([403, 403])
    expect(mocked.listClass).not.toHaveBeenCalled()
    expect(mocked.create).not.toHaveBeenCalled()
  })

  it('lists only within the live teacher class and live pupil session', async () => {
    process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
    mocked.classAccess.mockResolvedValueOnce(false)
    const deniedTeacher = response()
    await teacherHandler({ method: 'GET', headers: {}, query: { classId: 'CLASS' } }, deniedTeacher)
    expect(deniedTeacher.code).toBe(403)
    const teacher = response()
    await teacherHandler({ method: 'GET', headers: {}, query: { classId: 'CLASS' } }, teacher)
    expect(teacher.data.assignments).toEqual([{ assignmentId: 'ASSIGNMENT' }])
    expect(teacher.data.testStudentIds).toEqual(['PUPIL'])
    mocked.pupil.mockResolvedValueOnce(null)
    const deniedPupil = response()
    await pupilAssignmentsHandler({ method: 'GET', headers: {} }, deniedPupil)
    expect(deniedPupil.code).toBe(401)
    const pupil = response()
    await pupilAssignmentsHandler({ method: 'GET', headers: {} }, pupil)
    expect(pupil.data.assignments).toEqual([{ assignmentId: 'ASSIGNMENT', items: [] }])
    expect(mocked.listPupil).toHaveBeenCalledWith(expect.objectContaining({ studentId: 'PUPIL' }))
  })

  it('requires live pupil session, origin and CSRF for mutation', async () => {
    process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
    mocked.pupil.mockResolvedValueOnce(null)
    const noSession = response()
    await pupilHandler({ method: 'POST', headers: {}, body: { action: 'open' } }, noSession)
    expect(noSession.code).toBe(401)
    mocked.origin.mockReturnValueOnce(false)
    const noOrigin = response()
    await pupilHandler({ method: 'POST', headers: {}, body: { action: 'open' } }, noOrigin)
    expect(noOrigin.code).toBe(401)
    mocked.csrf.mockReturnValueOnce(false)
    const noCsrf = response()
    await pupilHandler({ method: 'POST', headers: {}, body: { action: 'open' } }, noCsrf)
    expect(noCsrf.code).toBe(401)
    expect(mocked.open).not.toHaveBeenCalled()
  })

  it('checks assignment access for opening, reading and appending', async () => {
    process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
    const opened = response()
    await pupilHandler({ method: 'POST', headers: {}, body: { action: 'open',
      assignmentId: 'ASSIGNMENT', assignmentItemId: 'ITEM' } }, opened)
    expect(opened.data.saveStatus).toBe('server_confirmed')
    const read = response()
    await pupilHandler({ method: 'GET', headers: {}, query: { attemptId: 'ATTEMPT' } }, read)
    expect(read.code).toBe(200)
    const appended = response()
    await pupilHandler({ method: 'POST', headers: {}, body: { action: 'append', attemptId: 'ATTEMPT',
      expectedRevision: 0, events: [{ eventId: 'ATTEMPT:1' }] } }, appended)
    expect(appended.data.ack).toEqual(['ATTEMPT:1'])
    expect(mocked.pupilAccess).toHaveBeenCalledTimes(3)
    mocked.pupilAccess.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }))
    const denied = response()
    await pupilHandler({ method: 'GET', headers: {}, query: { attemptId: 'ATTEMPT' } }, denied)
    expect(denied.code).toBe(403)
  })
})
