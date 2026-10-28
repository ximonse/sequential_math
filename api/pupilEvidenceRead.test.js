import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ get: vi.fn(), exists: vi.fn(), access: vi.fn(), auth: vi.fn(), screening: vi.fn(), enabled: true, allowed: true }))
vi.mock('@vercel/kv', () => ({ kv: { get: mock.get, exists: mock.exists } }))
vi.mock('./_studentAccess.js', () => ({ canAccessClass: mock.access, assertTeacherStudentAccess: vi.fn() }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: mock.auth, withCors: vi.fn() }))
vi.mock('./_pupilScreeningEvidence.js', () => ({ pupilScreeningEvidence: mock.screening }))
vi.mock('./_diagnosticApiAccess.js', () => ({ diagnosticApiEnabled: () => mock.enabled, diagnosticTestStudentAllowed: () => mock.allowed }))
import handler from './teacher-students/[studentId].js'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from '../src/domains/arithmetic/diagnosticGridModel.js'

const profile = { studentId: 'PUPIL', classId: 'CLASS', auth: { password: 'SECRET' }, problemLog: [
  { timestamp: Date.parse('2026-10-27T10:00Z'), observationId: 'A', correct: false, studentAnswer: 376 }] }
const query = { studentId: 'PUPIL', resource: 'evidence', classId: 'CLASS', from: '2026-10-27', to: '2026-10-27' }
async function call(extra = {}) {
  const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this },
    json(data) { this.data = data; return this } }
  await handler({ method: 'GET', headers: {}, query: { ...query, ...extra } }, res)
  return res
}
beforeEach(() => {
  vi.resetAllMocks()
  mock.enabled = true
  mock.allowed = true
  mock.auth.mockResolvedValue({ teacherId: 'TEACHER', role: 'teacher' })
  mock.access.mockResolvedValue(true)
  mock.exists.mockResolvedValue(false)
  mock.get.mockImplementation(async key => key === 'student:PUPIL' ? structuredClone(profile) : key === 'class:CLASS' ? {} : null)
  mock.screening.mockResolvedValue({ entries: [], coverage: { completeness: 'unknown' } })
})

describe('pupil evidence live access boundary', () => {
  it('exports only a revision-checked notebook, preserves source and rejects stale or unauthorized access', async () => {
    mock.auth.mockResolvedValue({ role: 'school_admin', teacherId: 'ADMIN' })
    const snapshot = recordDiagnosticGridEvent(createDiagnosticGrid({ attemptId: 'A', taskId: 'T', taskVersion: 1 }),
      { type: 'write', layer: 'main', position: { row: 2, column: 3 }, before: '', after: '4' }, Date.parse('2026-10-27T10:00Z'))
    mock.screening.mockResolvedValue({ entries: [{ source: 'screening', timestamp: Date.parse('2026-10-27T10:00Z'),
      reference: { attemptId: 'A' }, question: { taskId: 'T', taskVersion: 1, facitSv: 'SECRET_FACIT' },
      detail: { snapshot } }], coverage: {} })
    const listed = await call({ source: 'screening' })
    const args = { source: 'screening', ref: listed.data.entries[0].ref, snapshotRevision: listed.data.snapshotRevision, format: 'notebook' }
    const exported = await call(args)
    expect(exported.code).toBe(200)
    expect(exported.data.notebook.status).toMatchObject({ answerEmpty: true, gridHasContent: true })
    expect(exported.data.notebook.text).toContain('r3: 4')
    expect(JSON.stringify(exported.data)).not.toMatch(/SECRET_FACIT|password|events/u)
    expect((await call({ source: 'screening', format: 'notebook' })).code).toBe(400)
    expect((await call({ ...args, snapshotRevision: 'stale' })).code).toBe(409)
    mock.access.mockResolvedValueOnce(false)
    expect((await call(args)).code).toBe(403)
    expect((await call({ format: 'notebook', ref: (await call()).data.entries[0].ref,
      snapshotRevision: (await call()).data.snapshotRevision })).code).toBe(404)
  })
  it('requires authentication and returns only projected evidence to an ordinary authorized teacher', async () => {
    mock.auth.mockResolvedValueOnce(null)
    expect((await call()).code).toBe(401)
    const result = await call()
    expect(result.code).toBe(200)
    expect(result.data.total).toBe(1)
    expect(JSON.stringify(result.data)).not.toContain('SECRET')
    expect(mock.screening).not.toHaveBeenCalled()
  })
  it('checks class membership, deletion, archival and revoked access including during detail reads', async () => {
    expect((await call({ classId: 'OTHER' })).code).toBe(403)
    mock.exists.mockResolvedValueOnce(true)
    expect((await call()).code).toBe(403)
    mock.access.mockResolvedValueOnce(false)
    expect((await call()).code).toBe(403)
    mock.access.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    expect((await call()).code).toBe(403)
    const first = await call()
    mock.access.mockResolvedValueOnce(false)
    expect((await call({ ref: first.data.entries[0].ref, snapshotRevision: first.data.snapshotRevision })).code).toBe(403)
    mock.get.mockImplementation(async key => key === 'student:PUPIL' ? profile : { archived: true })
    expect((await call()).code).toBe(403)
  })
  it('retains the screening admin boundary without blocking ordinary practice reads', async () => {
    expect((await call({ source: 'all' })).code).toBe(403)
    expect(mock.screening).not.toHaveBeenCalled()
    mock.auth.mockResolvedValue({ role: 'school_admin', teacherId: 'ADMIN' })
    expect((await call({ source: 'all' })).code).toBe(200)
    expect(mock.screening).toHaveBeenCalledWith('PUPIL', 'CLASS')
  })
  it('rechecks role and membership after slow screening reads', async () => {
    mock.auth.mockResolvedValueOnce({ role: 'school_admin', teacherId: 'ADMIN' })
      .mockResolvedValueOnce({ role: 'teacher', teacherId: 'ADMIN' })
    expect((await call({ source: 'screening' })).code).toBe(403)
    mock.auth.mockResolvedValue({ role: 'school_admin', teacherId: 'ADMIN' })
    let reads = 0
    mock.get.mockImplementation(async key => key === 'student:PUPIL'
      ? { ...profile, classId: ++reads === 1 ? 'CLASS' : 'OTHER' } : {})
    expect((await call({ source: 'screening' })).code).toBe(403)
  })
  it('keeps feature activation and the configured pilot restriction closed even for an admin', async () => {
    mock.auth.mockResolvedValue({ role: 'school_admin', teacherId: 'ADMIN' })
    mock.enabled = false
    expect((await call({ source: 'all' })).code).toBe(403)
    mock.enabled = true
    mock.allowed = false
    expect((await call({ source: 'screening' })).code).toBe(403)
    expect(mock.screening).not.toHaveBeenCalled()
  })
  it('rejects malformed periods, unsupported sources and stale snapshot references', async () => {
    expect((await call({ from: '2026-02-30' })).code).toBe(400)
    expect((await call({ source: 'secret' })).code).toBe(400)
    expect((await call({ classId: '../CLASS' })).code).toBe(400)
    expect((await call({ snapshotRevision: 'stale' })).code).toBe(409)
  })
})
