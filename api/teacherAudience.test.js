import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ get: vi.fn(), smembers: vi.fn(), auth: vi.fn(), access: vi.fn(), deleted: vi.fn() }))
vi.mock('@vercel/kv', () => ({ kv: { get: mock.get, smembers: mock.smembers } }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: mock.auth }))
vi.mock('./_studentAccess.js', () => ({ canAccessClass: mock.access }))
vi.mock('./_studentStore.js', () => ({ isStudentDeleted: mock.deleted }))
vi.mock('./_groupStore.js', () => ({ authCanManageGroup: (auth, group) => Boolean(auth && group?.teacherIds.includes(auth.teacherId)) }))
import { teacherAudience, teacherGroupChoices } from './_teacherAudience.js'
let records
const response = () => ({ code: 200, setHeader() {}, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } })
async function call(query = {}) {
  const res = response()
  await teacherAudience({ query: { targetType: 'class', targetId: 'C', ...query } }, res)
  return res
}
beforeEach(() => {
  vi.resetAllMocks()
  records = {
    'class:C': { id: 'C', name: '6' }, 'class:D': { id: 'D', name: '7' },
    'student:P': { studentId: 'P', displayAlias: 'Kod Ett', classId: 'D', classIds: ['C', 'D'], password: 'PRIVATE', problemLog: ['PRIVATE'] },
    'student:Q': { studentId: 'Q', displayAlias: 'Kod Två', classId: 'C' },
    'student:FOREIGN': { studentId: 'FOREIGN', classId: 'X' },
    'group:G': { id: 'G', name: 'Grupp', teacherIds: ['T'], pupilIds: ['P', 'Q'], secret: 'PRIVATE' },
    'group:H': { id: 'H', name: 'Hemlig', teacherIds: ['OTHER'], pupilIds: ['FOREIGN'] }
  }
  mock.get.mockImplementation(async key => records[key] || null)
  mock.smembers.mockImplementation(async key => key === 'students:index' ? ['P', 'Q', 'FOREIGN'] : ['G', 'H'])
  mock.auth.mockResolvedValue({ teacherId: 'T', role: 'teacher' })
  mock.access.mockImplementation(async (_req, id) => id === 'C')
  mock.deleted.mockResolvedValue(false)
})
it('returns exact class roster including secondary members with minimal metadata, revision paging and unknown historical membership', async () => {
  const first = await call({ limit: 1 })
  expect(first.code).toBe(200)
  expect(first.data).toMatchObject({ total: 2, nextOffset: 1, membershipBasis: 'current', historicalMembership: 'unknown' })
  expect(first.data.pupils).toEqual([{ studentId: 'P', codeName: 'Kod Ett', classIds: ['C'] }])
  expect(JSON.stringify(first.data)).not.toMatch(/PRIVATE|password|problemLog|FOREIGN|teacherIds/u)
  const second = await call({ offset: 1, rosterRevision: first.data.rosterRevision })
  expect(second.data.pupils[0].studentId).toBe('Q')
  records['student:Q'].classId = 'D'
  expect((await call({ offset: 1, rosterRevision: first.data.rosterRevision })).code).toBe(409)
})
it('includes pupils with no answer data and supports an empty class without inventing coverage', async () => {
  expect((await call()).data.total).toBe(2)
  records['student:P'].classIds = ['D']; records['student:Q'].classId = 'D'
  expect((await call()).data).toMatchObject({ total: 0, pupils: [], nextOffset: null })
})
it('ignores unrelated legacy IDs in the global index but rejects unsupported IDs in the chosen class or group', async () => {
  records['student:legacy:foreign'] = { studentId: 'legacy:foreign', classId: 'D' }
  mock.smembers.mockImplementation(async key => key === 'students:index' ? ['P', 'Q', 'legacy:foreign'] : ['G', 'H'])
  const selected = await call()
  expect(selected.code).toBe(200)
  expect(selected.data.pupils.map(pupil => pupil.studentId)).toEqual(['P', 'Q'])
  records['student:legacy:foreign'].classId = 'C'
  expect((await call()).code).toBe(409)
  records['group:G'].pupilIds.push('legacy:foreign')
  expect((await call({ targetType: 'group', targetId: 'G' })).code).toBe(409)
})
it('fails explicitly for inaccessible or deleted group members instead of silently dropping them', async () => {
  expect((await call({ targetType: 'group', targetId: 'G' })).data.total).toBe(2)
  mock.deleted.mockImplementation(async id => id === 'Q')
  expect((await call({ targetType: 'group', targetId: 'G' })).code).toBe(409)
  mock.deleted.mockResolvedValue(false)
  records['group:G'].pupilIds.push('FOREIGN')
  expect((await call({ targetType: 'group', targetId: 'G' })).code).toBe(403)
  expect((await call({ targetType: 'group', targetId: 'H' })).code).toBe(403)
})
it('does not inspect unrelated pupil deletion records while resolving a class', async () => {
  mock.deleted.mockImplementation(async id => {
    if (id === 'FOREIGN') throw Error('Unrelated storage must not delay or block this class')
    return id === 'Q'
  })
  const selected = await call()
  expect(selected.code).toBe(200)
  expect(selected.data.pupils.map(pupil => pupil.studentId)).toEqual(['P'])
  expect((await call({ targetType: 'group', targetId: 'G' })).code).toBe(409)
})
it('rejects session changes, archived classes, invalid selectors and live roster changes', async () => {
  expect((await call({ targetType: 'everyone' })).code).toBe(400)
  expect((await call({ limit: 101 })).code).toBe(400)
  records['class:C'].archived = true
  expect((await call()).code).toBe(403)
  records['class:C'].archived = false
  mock.auth.mockResolvedValueOnce({ teacherId: 'T' }).mockResolvedValueOnce({ teacherId: 'OTHER' })
  expect((await call()).code).toBe(401)
  mock.auth.mockResolvedValue({ teacherId: 'T' })
  let reads = 0
  mock.get.mockImplementation(async key => {
    if (key === 'student:Q' && ++reads >= 2) return null
    return records[key] || null
  })
  expect((await call()).code).toBe(409)
})
it('lists minimal authorized group candidates including duplicate names and validates limits', async () => {
  records['group:H'].teacherIds = ['T']; records['group:H'].name = 'Grupp'
  const res = response()
  await teacherGroupChoices({ query: { query: 'Grupp', limit: 1 } }, res)
  expect(res.data).toEqual({ groups: [{ groupId: 'G', name: 'Grupp' }], total: 2, nextOffset: 1 })
  expect(JSON.stringify(res.data)).not.toMatch(/PRIVATE|pupilIds|teacherIds/u)
  const invalid = response()
  await teacherGroupChoices({ query: { offset: -1 } }, invalid)
  expect(invalid.code).toBe(400)
})
it('rechecks live group access after candidate reads and blocks a removed member in student selection', async () => {
  let reads = 0
  mock.get.mockImplementation(async key => key === 'group:G' && ++reads > 1
    ? { ...records[key], teacherIds: ['OTHER'] } : records[key] || null)
  const res = response()
  await teacherGroupChoices({ query: {} }, res)
  expect(res.data.groups).toEqual([])
  mock.deleted.mockResolvedValue(true)
  expect((await call({ targetType: 'student', targetId: 'P' })).code).toBe(409)
})
