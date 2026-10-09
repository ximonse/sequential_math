import { describe, expect, it, vi } from 'vitest'
import { isolatedVerificationStore } from './verify-diagnostic-collection-redis.mjs'
import { SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT } from '../api/_diagnosticCollectionStore.js'

function fakeClient() {
  const values = new Map([['student:real-pupil', { keep: true }]])
  return {
    values,
    get: vi.fn(async key => values.get(key)),
    exists: vi.fn(async key => Number(values.has(key))),
    set: vi.fn(async (key, value) => { values.set(key, value); return 'OK' }),
    rpush: vi.fn(async (key, ...events) => { values.set(key, events); return events.length }),
    lrange: vi.fn(async key => values.get(key) || []),
    expire: vi.fn(async () => 1),
    eval: vi.fn(async () => 1),
    del: vi.fn(async (...keys) => { for (const key of keys) values.delete(key); return keys.length }),
  }
}

describe('real Redis verification isolation', () => {
  it('namespaces every read/write and Lua key, then deletes only its own keys', async () => {
    const client = fakeClient()
    const store = isolatedVerificationStore(client)
    await store.set('student:real-pupil', { fake: true })
    await store.get('student:real-pupil')
    await store.exists('class:class')
    await store.rpush('events:attempt', [{ type: 'submit' }])
    await store.lrange('events:attempt', 0, -1)
    await store.eval(SUBMIT_DIAGNOSTIC_COLLECTION_SCRIPT, ['student:real-pupil', 'class:class'], ['pupil', '[]'])
    for (const method of ['set', 'get', 'exists', 'rpush', 'lrange']) {
      expect(client[method].mock.calls.every(([key]) => key.startsWith(store.prefix))).toBe(true)
    }
    expect(client.set).toHaveBeenCalledWith(`${store.prefix}student:real-pupil`, { fake: true }, { ex: 3600 })
    expect(client.eval.mock.calls[0][1]).toEqual([`${store.prefix}student:real-pupil`, `${store.prefix}class:class`])
    expect(client.expire).toHaveBeenCalledWith(`${store.prefix}student:real-pupil`, 3600)
    expect(await store.cleanup()).toBe(3)
    expect(client.del.mock.calls[0].every(key => key.startsWith(store.prefix))).toBe(true)
    expect([...client.values]).toEqual([['student:real-pupil', { keep: true }]])
  })

  it('rejects unrelated Lua scripts before executing and separates consecutive runs', async () => {
    const client = fakeClient()
    const first = isolatedVerificationStore(client)
    const second = isolatedVerificationStore(client)
    expect(first.prefix).not.toEqual(second.prefix)
    await expect(first.eval("redis.call('FLUSHDB')", [], [])).rejects.toThrow()
    expect(client.eval).not.toHaveBeenCalled()
    await expect(first.set('', {})).rejects.toThrow()
    await first.set('student:test', {})
    await second.set('student:test', {})
    await first.cleanup()
    expect(await second.exists('student:test')).toBe(1)
    await second.cleanup()
  })

  it('reports cleanup failure rather than claiming test data was removed', async () => {
    const client = fakeClient()
    const store = isolatedVerificationStore(client)
    await store.set('student:test', {})
    client.del.mockImplementationOnce(async () => 0)
    await expect(store.cleanup()).rejects.toThrow()
    await store.cleanup()
  })
})
