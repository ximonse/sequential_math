import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ get: vi.fn(), smembers: vi.fn(), exists: vi.fn(), access: vi.fn(), auth: vi.fn(), authorized: true }))
vi.mock('@vercel/kv', () => ({ kv: { get: mock.get, smembers: mock.smembers, exists: mock.exists } }))
vi.mock('./_helpers.js', () => ({ withCors: () => {}, isLiveTeacherApiAuthorized: async () => mock.authorized, getLiveTeacherAuthPayload: mock.auth }))
vi.mock('./_studentAccess.js', () => ({ getLiveAuthorizedClassIds: mock.access }))
import handler from './students.js'
async function call(query = {}) {
  const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
  await handler({ method: 'GET', query: { resource: 'classes', ...query } }, res)
  return res
}
beforeEach(() => {
  vi.resetAllMocks(); mock.authorized = true
  mock.auth.mockResolvedValue({ teacherId: 'T' })
  mock.access.mockResolvedValue(['six', 'sixteen', 'empty', 'archived', 'deleted'])
  mock.smembers.mockResolvedValue(['six', 'sixteen', 'empty', 'private', 'archived', 'deleted'])
  mock.exists.mockImplementation(async key => key === 'class_deleted:deleted')
  mock.get.mockImplementation(async key => ({ id: key.slice(6), name: key === 'class:six' ? '6' : key === 'class:sixteen' ? '16' : key.slice(6),
    archived: key === 'class:archived', loginToken: 'PRIVATE_TOKEN', teacherIds: ['PRIVATE_TEACHER'] }))
})
it('returns authorized class candidates including empty classes without pupil or private class data and without writes', async () => {
  const result = await call()
  expect(result.code).toBe(200)
  expect(result.data.classes.map(c => c.classId)).toEqual(['empty', 'six', 'sixteen'])
  expect(JSON.stringify(result.data)).not.toMatch(/PRIVATE|loginToken|teacherIds|student/u)
  expect(mock.smembers.mock.calls.every(([key]) => key === 'classes:index')).toBe(true)
  expect((await call({ query: '6', limit: 1 })).data).toMatchObject({ total: 2, nextOffset: 1 })
  expect((await call({ query: '6', limit: 1, offset: 1 })).data.classes[0].classId).toBe('sixteen')
})
it('rechecks revoked access and expired sessions and validates page limits', async () => {
  mock.access.mockResolvedValueOnce(['six', 'empty']).mockResolvedValueOnce(['empty'])
  expect((await call()).data.classes.map(c => c.classId)).toEqual(['empty'])
  mock.auth.mockResolvedValueOnce(null)
  expect((await call()).code).toBe(401)
  expect((await call({ limit: 101 })).code).toBe(400)
  mock.authorized = false
  expect((await call()).code).toBe(401)
})
