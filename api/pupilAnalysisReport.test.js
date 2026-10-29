import { beforeEach, describe, expect, it, vi } from 'vitest'
const auth = vi.hoisted(() => ({ teacher: { teacherId: 'T', role: 'teacher' }, access: true }))
vi.mock('@vercel/kv', () => ({ kv: Object.fromEntries(['get', 'set', 'eval', 'exists'].map(method => [method,
  async (...args) => (await import('../robots/memoryKv.js')).kv[method](...args)])) }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: async req => req.headers ? auth.teacher : null, withCors: () => {} }))
vi.mock('./_studentAccess.js', () => ({ canAccessClass: async req => auth.access && Boolean(req.headers), assertTeacherStudentAccess: async () => {} }))
import { kv } from '../robots/memoryKv.js'
import handler from './teacher-students/[studentId].js'
import { pupilAnalysisKey } from './_pupilAnalysisStore.js'

const period = { from: '2026-10-27', to: '2026-10-27', source: 'practice' }
async function call(body, extra = {}) {
  const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
  const req = { method: body ? 'POST' : 'GET', body,
    query: { resource: 'analysis', studentId: 'PUPIL', classId: 'CLASS', ...extra } }
  Object.defineProperty(req, 'headers', { get: () => ({ 'x-teacher-token': 'synthetic-test-token' }) })
  await handler(req, res)
  return res
}
async function draft() { return (await call({ action: 'draft', ...period })).data }
beforeEach(async () => {
  kv._reset(); auth.teacher = { teacherId: 'T', role: 'teacher' }; auth.access = true
  await kv.set('class:CLASS', {})
  await kv.set('student:PUPIL', { studentId: 'PUPIL', classId: 'CLASS', problemLog: [
    { observationId: 'OBS', timestamp: Date.parse('2026-10-27T10:00Z'), correct: false, studentAnswer: 376, correctAnswer: 224,
      promptText: '402 − 178', operation: 'subtraction', errorPatterns: ['borrow'] }] })
})

describe('analysis API and durable teacher check-ins', () => {
  it('previews without writes, stores immutable versions and safely retries one exact command', async () => {
    const data = await draft()
    expect(await kv.get(pupilAnalysisKey('PUPIL', 'CLASS', 'T'))).toBeNull()
    const command = { action: 'create_report', ...period, requestId: 'request-0001', expectedRevision: 0, report: data.draft }
    const saved = await call(command)
    expect(saved.code).toBe(200)
    expect(saved.data.reports).toHaveLength(1)
    expect((await call(command)).data.reports).toHaveLength(1)
    expect((await kv.get('student:PUPIL')).problemLog[0].studentAnswer).toBe(376)
    const reportId = saved.data.affectedReportId
    const check = { action: 'check_in', reportId, requestId: 'check-0001', expectedRevision: 1,
      checkIn: { goalSv: 'Pröva växling', noteSv: 'Behöver fler kontraster.', decisions: [
        { hypothesisId: data.draft.hypotheses[0].id, decision: 'rejected', interpretationSv: 'Eleven använde en annan metod.' }] } }
    const checked = await call(check)
    expect(checked.data.reports[0].checkIns).toHaveLength(1)
    expect(checked.data.reports[0].report).toEqual(saved.data.reports[0].report)
    expect((await call(check)).data.reports[0].checkIns).toHaveLength(1)
    expect((await call()).data.reports[0].checkIns[0].decisions[0].decision).toBe('rejected')
    check.requestId = 'check-0002'
    expect((await call(check)).code).toBe(409)
  })
  it('rejects invented references, stale source data and writes after retirement or revoked access', async () => {
    const data = await draft()
    const command = { action: 'create_report', ...period, requestId: 'request-0001', expectedRevision: 0, report: data.draft }
    command.report.hypotheses[0].supportRefs = ['FAKE']
    expect((await call(command)).code).toBe(400)
    command.report = (await draft()).draft
    const profile = await kv.get('student:PUPIL')
    profile.problemLog.push({ ...profile.problemLog[0], observationId: 'NEW' })
    await kv.set('student:PUPIL', profile)
    expect((await call(command)).code).toBe(409)
    auth.access = false
    expect((await call()).code).toBe(403)
    auth.access = true
    await kv.set('student_deleted:PUPIL', true)
    expect((await call()).code).toBe(403)
  })
  it('isolates teacher ownership and never leaks stored screening text through reads or practice writes', async () => {
    const protectedReport = { id: 'SECRET', requestId: 'other-request', checkIns: [], report: { source: 'screening', text: 'SECRET_SCREENING' } }
    await kv.set(pupilAnalysisKey('PUPIL', 'CLASS', 'T'), { schemaVersion: 1, studentId: 'PUPIL', classId: 'CLASS', teacherId: 'T', revision: 1, reports: [protectedReport] })
    expect(JSON.stringify((await call()).data)).not.toContain('SECRET_SCREENING')
    const data = await draft()
    const saved = await call({ action: 'create_report', ...period, requestId: 'request-0001', expectedRevision: 1, report: data.draft })
    expect(saved.code).toBe(200)
    expect(JSON.stringify(saved.data)).not.toContain('SECRET_SCREENING')
    auth.teacher = { teacherId: 'OTHER', role: 'teacher' }
    expect((await call()).data.reports).toEqual([])
    auth.teacher = null
    expect((await call()).code).toBe(401)
  })
})
