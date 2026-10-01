import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({ teacher: vi.fn(), classAccess: vi.fn(), testStudents: vi.fn(),
  assignments: vi.fn(), members: vi.fn(), get: vi.fn(), read: vi.fn(), observe: vi.fn(), align: vi.fn() }))
vi.mock('@vercel/kv', () => ({ kv: { smembers: mocked.members, get: mocked.get } }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: mocked.teacher, withCors: vi.fn() }))
vi.mock('./_studentAccess.js', () => ({ canAccessClass: mocked.classAccess }))
vi.mock('./_diagnosticApiAccess.js', () => ({ diagnosticApiEnabled: () => process.env.NCM_DIAGNOSTIC_API_ENABLED === 'true',
  diagnosticTestStudentsInClass: mocked.testStudents }))
vi.mock('./_diagnosticAssignmentList.js', () => ({ listClassDiagnosticAssignments: mocked.assignments }))
vi.mock('./_diagnosticAttemptStore.js', () => ({ readDiagnosticAttempt: mocked.read }))
vi.mock('../src/domains/arithmetic/diagnosticObservation.js', () => ({ summarizeDiagnosticObservation: mocked.observe }))
vi.mock('../src/domains/arithmetic/diagnosticColumnAlignment.js', () => ({ analyzeDiagnosticColumnAlignment: mocked.align }))

import handler from './teacher-diagnostic-attempts.js'

const query = { classId: 'CLASS', studentId: 'PUPIL', assignmentId: 'ASSIGNMENT' }
const task = { taskId: 'add-no-carry-001', taskVersion: 1 }
const record = { attemptId: 'ATTEMPT', assignmentId: 'ASSIGNMENT', assignmentItemId: 'ITEM',
  studentId: 'PUPIL', classIdAtAttempt: 'CLASS', evidenceClass: 'diagnostic_only',
  taskId: task.taskId, taskVersion: 1, status: 'in_progress', serverRevision: 1, lastSequence: 2 }
const response = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this },
  json(data) { this.data = data; return this }, end() { return this } })
const call = async (input = query) => {
  const res = response()
  await handler({ method: 'GET', headers: {}, query: input }, res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
  mocked.teacher.mockResolvedValue({ role: 'school_admin', teacherId: 'ADMIN' })
  mocked.classAccess.mockResolvedValue(true)
  mocked.testStudents.mockResolvedValue(['PUPIL'])
  mocked.assignments.mockResolvedValue([{ assignmentId: 'ASSIGNMENT', classId: 'CLASS',
    studentIds: ['PUPIL'], items: [{ assignmentItemId: 'ITEM', ...task, taskSnapshot: task }] }])
  mocked.members.mockResolvedValue(['ATTEMPT', 'OTHER'])
  mocked.get.mockImplementation(async key => key === 'diagnostic_attempt:ATTEMPT' ? record
    : { ...record, attemptId: 'OTHER', studentId: 'OTHER' })
  mocked.read.mockResolvedValue({ record, snapshot: { events: [] } })
  mocked.observe.mockReturnValue({ answerStatus: 'unanswered' })
  mocked.align.mockReturnValue({ status: 'unknown' })
})

describe('teacher diagnostic evidence read boundary', () => {
  it('stays closed until explicitly enabled and requires an admin session', async () => {
    delete process.env.NCM_DIAGNOSTIC_API_ENABLED
    expect((await call()).code).toBe(404)
    process.env.NCM_DIAGNOSTIC_API_ENABLED = 'true'
    mocked.teacher.mockResolvedValueOnce(null)
    expect((await call()).code).toBe(401)
    mocked.teacher.mockResolvedValueOnce({ role: 'teacher', teacherId: 'TEACHER' })
    expect((await call()).code).toBe(403)
    expect(mocked.members).not.toHaveBeenCalled()
  })

  it('requires current class access and a configured pupil in that class', async () => {
    mocked.classAccess.mockResolvedValueOnce(false)
    expect((await call()).code).toBe(403)
    mocked.testStudents.mockResolvedValueOnce([])
    expect((await call()).code).toBe(403)
    expect(mocked.members).not.toHaveBeenCalled()
  })

  it('lists only the requested pupil and returns validated detail separately', async () => {
    const listed = await call()
    expect(listed.data.attempts).toEqual([{ attemptId: 'ATTEMPT', assignmentItemId: 'ITEM',
      taskId: task.taskId, taskVersion: 1, status: 'in_progress', serverRevision: 1, lastSequence: 2 }])
    expect(listed.data.snapshot).toBeUndefined()
    const detail = await call({ ...query, attemptId: 'ATTEMPT' })
    expect(detail.code).toBe(200)
    expect(detail.data).toMatchObject({ record, observation: { answerStatus: 'unanswered' },
      columnAlignment: { status: 'unknown' } })
    expect(mocked.observe).toHaveBeenCalledWith(task, { events: [] })
  })

  it('rejects a foreign attempt and a removed assignment', async () => {
    expect((await call({ ...query, attemptId: 'OTHER' })).code).toBe(404)
    mocked.assignments.mockResolvedValueOnce([])
    expect((await call()).code).toBe(404)
    expect(mocked.read).not.toHaveBeenCalled()
  })
})
