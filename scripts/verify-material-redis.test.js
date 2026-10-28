import { expect, it, vi } from 'vitest'
import { isolatedMaterialStore } from './verify-material-redis.mjs'
import { MATERIAL_DRAFT_CAS } from '../api/_teacherMaterialStore.js'
import { MATERIAL_DISPATCH_CAS } from '../api/_teacherMaterialDispatchStore.js'
import { localWslRedisClient } from './wsl-redis-verification-client.mjs'

function clientFixture() {
  const values = new Map([['student:real-pupil', 'untouched']])
  return { values,
    get: vi.fn(async key => values.get(key) ?? null),
    set: vi.fn(async (key, value) => { values.set(key, value); return 'OK' }),
    sadd: vi.fn(async (key, ...members) => { values.set(key, members); return members.length }),
    exists: vi.fn(async key => Number(values.has(key))),
    expire: vi.fn(async () => 1), eval: vi.fn(async () => 1),
    del: vi.fn(async (...keys) => { keys.forEach(key => values.delete(key)); return keys.length }) }
}
it('isolates every material read/write, Lua key and cleanup while leaving an unrelated pupil untouched', async () => {
  const client = clientFixture(), store = isolatedMaterialStore(client)
  await store.set('student:real-pupil', { synthetic: true })
  await store.get('student:real-pupil')
  await store.sadd('teacher_material_index:T', 'draft')
  for (const script of [MATERIAL_DRAFT_CAS, MATERIAL_DISPATCH_CAS]) {
    await store.eval(script, ['teacher_material:T:D', 'student:real-pupil'], ['0', '{}'])
  }
  for (const method of ['set', 'get', 'sadd', 'expire']) {
    expect(client[method].mock.calls.every(([key]) => key.startsWith(store.prefix))).toBe(true)
  }
  for (const [, keys] of client.eval.mock.calls) expect(keys.every(key => key.startsWith(store.prefix))).toBe(true)
  expect(client.set).toHaveBeenCalledWith(`${store.prefix}student:real-pupil`, { synthetic: true }, { ex: 3600 })
  await store.cleanup()
  expect([...client.values]).toEqual([['student:real-pupil', 'untouched']])
  expect(client.del.mock.calls[0].every(key => key.startsWith(store.prefix))).toBe(true)
})
it('rejects arbitrary Lua and invalid keys, separates runs and reports cleanup failure', async () => {
  const client = clientFixture(), one = isolatedMaterialStore(client), two = isolatedMaterialStore(client)
  expect(one.prefix).not.toBe(two.prefix)
  await expect(one.eval("redis.call('FLUSHDB')", [], [])).rejects.toThrow()
  expect(client.eval).not.toHaveBeenCalled()
  await expect(one.set('', {})).rejects.toThrow()
  await one.set('draft', {})
  client.del.mockImplementationOnce(async () => 0)
  await expect(one.cleanup()).rejects.toThrow()
  await two.set('draft', { keep: true })
  await one.cleanup()
  expect(await two.get('draft')).toEqual({ keep: true })
  await two.cleanup()
})
it('local verification requires explicit absolute Unix socket and redis-cli, with no remote URL fallback', () => {
  expect(() => localWslRedisClient('redis-cli', '/tmp/test.sock')).toThrow()
  expect(() => localWslRedisClient('/tmp/redis-cli', 'redis://production')).toThrow()
  expect(() => localWslRedisClient('/tmp/redis-cli;echo', '/tmp/test.sock')).toThrow()
  expect(() => localWslRedisClient('/tmp/redis-cli', '/tmp/test.sock')).not.toThrow()
})
