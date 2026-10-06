import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@vercel/kv', () => ({ kv: Object.fromEntries(['get', 'set', 'eval', 'scan', 'exists', 'smembers', 'srem', 'del', 'lrange'].map(method => [method,
  async (...args) => (await import('../robots/memoryKv.js')).kv[method](...args)])) }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: async req => req.auth, withCors: () => {} }))
import { kv } from '../robots/memoryKv.js'
import handler from './admin/pupil-analysis.js'

beforeEach(() => kv._reset())
async function call(method, auth, query = {}) {
  const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
  await handler({ method, auth, query }, res)
  return res
}
it('requires live superadmin authorization for analysis and deletion', async () => {
  expect((await call('GET', null)).code).toBe(401)
  expect((await call('GET', { role: 'teacher' })).code).toBe(403)
  expect((await call('DELETE', { role: 'school_admin' })).code).toBe(403)
})
it('lists and deletes a frozen series without linking it back to a pupil', async () => {
  const archiveId = 'a'.repeat(32)
  const archive = { archiveId, training: { attempts: [{ correct: true }], grade: 6 }, diagnostics: { points: [] } }
  await kv.set(`pupil_analysis:${archiveId}`, archive)
  await kv.sadd('pupil_analysis:index', archiveId)
  const auth = { role: 'super_admin' }
  expect((await call('GET', auth)).data.archives).toEqual([{ archiveId, grade: 6, trainingAnswers: 1, diagnosticPoints: 0 }])
  expect((await call('GET', auth, { archiveId })).data.archive).toEqual(archive)
  expect((await call('DELETE', auth, { archiveId })).code).toBe(200)
  expect(await kv.get(`pupil_analysis:${archiveId}`)).toBeNull()
  expect(await kv.smembers('pupil_analysis:index')).toEqual([])
})
