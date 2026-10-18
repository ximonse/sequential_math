import { beforeEach, describe, expect, it, vi } from 'vitest'
const memory = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: async key => structuredClone(memory.get(key) ?? null),
  set: async (key, value) => memory.set(key, structuredClone(value)),
  smembers: async key => [...(memory.get(key) || [])],
  scan: async (_cursor, { match }) => [0, [...memory.keys()].filter(key => key.startsWith(match.replace('*', '')))],
  eval: async (script, keys, args) => {
    const { emulateAttentionArchive } = await import('./testHelpers/attentionArchiveKv.js')
    return emulateAttentionArchive(memory, script, keys, args).result
  },
  _reset: () => memory.clear()
} }))
vi.mock('./_helpers.js', () => ({ getLiveTeacherAuthPayload: async req => req.teacher, withCors: () => {} }))
import { kv } from '@vercel/kv'
import { archiveAttentionEvents, attentionArchiveKey, readAttentionArchive } from './_attentionArchive.js'
import handler from './teacher-attention.js'
import { createStudentProfile } from '../src/lib/studentProfile.js'
import { studentDeletedKey } from './_studentStore.js'
import { buildPupilCleanup } from './_pupilLifecycle.js'

const pass = id => ({ id, version: 1, mode: 'discover', startedAt: 1000, finishedAt: 5000,
  activeMs: 4000, aborted: true, summary: { hits: 1, misses: 0, wrong: 0, withheld: 0, early: 0, median: 200 } })
let profile
beforeEach(async () => {
  kv._reset(); profile = createStudentProfile('PUPIL', 'Elev', 6)
  profile.attentionHistory = [pass('old')]
  await kv.set('student:PUPIL', profile)
})
describe('durable attention archive', () => {
  it('migrates before cache eviction, retains more than 500 passes, pages all records and preserves immutable originals', async () => {
    for (let batch = 0; batch < 6; batch++) await archiveAttentionEvents('PUPIL', profile,
      Array.from({ length: 100 }, (_, i) => ({ type: 'attention_result', payload: pass(`pass-${batch}-${i}`) })), { now: 10000 })
    await archiveAttentionEvents('PUPIL', profile, [{ type: 'attention_result', payload: { ...pass('pass-0-0'), activeMs: 3000 } }], { now: 20000 })
    profile.attentionHistory = []
    const results = []; let after = ''
    do {
      const page = await readAttentionArchive('PUPIL', profile, { after, asOf: 15000 })
      results.push(...page.records); after = page.next
    } while (after)
    expect(results).toHaveLength(601)
    expect(results.find(entry => entry.result.id === 'pass-0-0').result.activeMs).toBe(4000)
    expect(results.find(entry => entry.result.id === 'old')).toBeTruthy()
  })
  it('keeps checkpoints in revision order, final result wins late retries, and frozen ID manifests exclude later passes', async () => {
    const checkpoint = revision => ({ type: 'attention_checkpoint', payload: { revision, result: { ...pass('live'), activeMs: revision * 1000 } } })
    await archiveAttentionEvents('PUPIL', profile, [checkpoint(2)], { now: 10000 })
    await archiveAttentionEvents('PUPIL', profile, [checkpoint(1)], { now: 11000 })
    expect((await kv.get(attentionArchiveKey('PUPIL', 'live'))).result.activeMs).toBe(2000)
    await archiveAttentionEvents('PUPIL', profile, [{ type: 'attention_result', payload: pass('live') }], { now: 12000 })
    await archiveAttentionEvents('PUPIL', profile, [checkpoint(3)], { now: 13000 })
    expect((await kv.get(attentionArchiveKey('PUPIL', 'live')))).toMatchObject({ final: true, result: { activeMs: 4000 } })
    const manifest = (await readAttentionArchive('PUPIL', profile, { asOf: 15000 })).manifest
    await archiveAttentionEvents('PUPIL', profile, [{ type: 'attention_result', payload: pass('new') }], { now: 20000 })
    expect((await readAttentionArchive('PUPIL', profile, { ids: manifest, asOf: 15000 })).records.map(entry => entry.result.id)).not.toContain('new')
  })
  it('retries a partially failed migration before allowing eviction and preserves a final event followed by an older checkpoint in one batch', async () => {
    profile.attentionHistory = Array.from({ length: 25 }, (_, i) => pass(`old-${i}`))
    let writes = 0
    await expect(archiveAttentionEvents('PUPIL', profile, [{ type: 'attention_result', payload: pass('new') }], {
      store: { get: kv.get, eval: async (...args) => { if (++writes === 2) throw new Error('interrupted'); return kv.eval(...args) } }
    })).rejects.toThrow('interrupted')
    expect(await kv.get('attention_migrated:PUPIL')).toBeNull()
    await archiveAttentionEvents('PUPIL', profile, [{ type: 'attention_result', payload: pass('new') },
      { type: 'attention_checkpoint', payload: { revision: 1, result: { ...pass('new'), activeMs: 1 } } }])
    expect((await readAttentionArchive('PUPIL', { attentionHistory: [] })).records).toHaveLength(26)
    expect((await kv.get(attentionArchiveKey('PUPIL', 'new')))).toMatchObject({ final: true, result: { activeMs: 4000 } })
  })
  it('does not acknowledge failed storage, blocks writes after retirement and includes archive in explicit deletion/anonymization', async () => {
    await expect(archiveAttentionEvents('PUPIL', profile, [{ type: 'attention_result', payload: pass('new') }],
      { store: { get: kv.get, eval: async () => { throw new Error('offline') } } })).rejects.toThrow('offline')
    await archiveAttentionEvents('PUPIL', profile, [{ type: 'attention_result', payload: pass('new') }])
    const { plan, archive } = await buildPupilCleanup('PUPIL', { mode: 'anonymize', profile, archiveId: 'anon' }, kv)
    expect(plan.deletes).toContain('attention_pass:PUPIL:new')
    expect(plan.deletes).toContain('attention_passes:PUPIL')
    expect(archive.attention).toHaveLength(2)
    expect(archive.attention[0]).not.toHaveProperty('startedAt')
    await kv.set(studentDeletedKey('PUPIL'), '1')
    await expect(archiveAttentionEvents('PUPIL', profile, [{ type: 'attention_result', payload: pass('blocked') }])).rejects.toMatchObject({ status: 409 })
    expect(await kv.get(attentionArchiveKey('PUPIL', 'blocked'))).toBeNull()
  })
  it('allows only the live main administrator, including in teacher mode, and sends no-store responses', async () => {
    const call = async teacher => {
      const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v }, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
      await handler({ method: 'GET', query: { studentId: 'PUPIL' }, teacher }, res)
      return res
    }
    expect((await call(null)).code).toBe(401)
    expect((await call({ role: 'teacher' })).code).toBe(403)
    expect((await call({ role: 'school_admin' })).code).toBe(403)
    const res = await call({ role: 'super_admin' })
    expect(res.code).toBe(200); expect(res.data.records[0].result).toEqual(pass('old'))
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect((await kv.get(attentionArchiveKey('PUPIL', 'old'))).result).toEqual(pass('old'))
    expect(await kv.get('student:PUPIL')).toEqual(profile)
  })
})
