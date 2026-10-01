import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({ teacher: vi.fn(), classAccess: vi.fn(), create: vi.fn(),
  pupil: vi.fn(), origin: vi.fn(), csrf: vi.fn(), open: vi.fn(), read: vi.fn(),
  append: vi.fn(), pupilAccess: vi.fn() }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: mocked.teacher, withCors: vi.fn() }))
vi.mock('./_studentAccess.js', () => ({ canAccessClass: mocked.classAccess }))
vi.mock('./_studentSession.js', () => ({ getLiveStudentSession: mocked.pupil,
  requestOriginIsTrusted: mocked.origin, hasStudentCsrf: mocked.csrf }))
vi.mock('./_diagnosticAssignmentStore.js', () => ({ createDiagnosticAssignment: mocked.create,
  openDiagnosticAttempt: mocked.open }))
vi.mock('./_diagnosticAttemptStore.js', () => ({ readDiagnosticAttempt: mocked.read,
  appendDiagnosticAttempt: mocked.append }))
vi.mock('./_diagnosticApiAccess.js', () => ({ diagnosticApiEnabled: () => process.env.NCM_DIAGNOSTIC_API_ENABLED === 'true',
  assertDiagnosticPupilAccess: mocked.pupilAccess }))

import teacherHandler from './teacher-diagnostic-assignments.js'
import pupilHandler from './me/diagnostic-attempt.js'

const response = () => ({ code: 200, headers: {}, setHeader(key, value) { this.headers[key] = value },
  status(code) { this.code = code; return this }, json(data) { this.data = data; return this },
  end() { return this } })
const attempt = { record: { attemptId: 'ATTEMPT', studentId: 'PUPIL', assignmentId: 'ASSIGNMENT',
  assignmentItemId: 'ITEM', classIdAtAttempt: 'CLASS', evidenceClass: 'diagnostic_only' },
snapshot: { events: [] } }

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.NCM_DIAGNOSTIC_API_ENABLED
  mocked.teacher.mockResolvedValue({ teacherId: 'TEACHER' })
  mocked.classAccess.mockResolvedValue(true)
  mocked.create.mockResolvedValue({ assignmentId: 'ASSIGNMENT' })
  mocked.pupil.mockResolvedValue({ profile: { studentId: 'PUPIL', classIds: ['CLASS'] }, session: {} })
  mocked.origin.mockReturnValue(true)
  mocked.csrf.mockReturnValue(true)
  mocked.open.mockResolvedValue({ kind: 'created', ...attempt })
  mocked.read.mockResolvedValue(attempt)
  mocked.append.mockResolvedValue({ kind: 'append', ack: ['ATTEMPT:1'], serverRevision: 1 })
})

describe('diagnostic pilot API boundary', () => {
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
    const created = response()
    await teacherHandler({ method: 'POST', headers: {}, body: { classId: 'CLASS', studentIds: ['PUPIL'],
      taskIds: ['add-no-carry-001'] } }, created)
    expect(created.code).toBe(201)
    expect(mocked.create).toHaveBeenCalledWith({ classId: 'CLASS', studentIds: ['PUPIL'],
      taskIds: ['add-no-carry-001'], teacherId: 'TEACHER' })
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
