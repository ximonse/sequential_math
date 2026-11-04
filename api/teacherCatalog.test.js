import { beforeEach, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ allowed: vi.fn(), records: new Map(), sets: new Map() }))
vi.mock('./_studentAccess.js', () => ({ getLiveAuthorizedClassIds: mock.allowed }))
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(mock.records.get(key) ?? null)),
  mget: vi.fn(async (...keys) => keys.map(key => structuredClone(mock.records.get(key) ?? null))),
  smembers: vi.fn(async key => mock.sets.get(key) || []),
  exists: vi.fn(async key => mock.records.has(key) ? 1 : 0),
  set: vi.fn(async (key, value) => mock.records.set(key, structuredClone(value))),
  del: vi.fn(async key => mock.records.delete(key)),
  eval: vi.fn(async (_script, [key, deleted, legacy, profile], [operation, value, json, live]) => {
    if (operation === 'set') {
      if (mock.records.has(deleted) || mock.records.has(legacy) || (live === 'live' && !mock.records.has(profile))) return 0
      mock.records.set(key, JSON.parse(value)); return 1
    }
    mock.records.set(key, JSON.parse(json)); return 1
  })
} }))
import { kv } from '@vercel/kv'
import { teacherCatalog, scopedStudentIds } from './_teacherCatalog.js'
import { catalogKey } from './_studentCatalogCard.js'
import { mutateStudentRecord, studentDeletedKey } from './_studentStore.js'
const profile = id => ({ profileSchemaVersion: 1, studentId: id, displayAlias: `Kod ${id}`, name: 'PRIVATE NAME',
  classId: 'C', grade: 6, recentProblems: [], problemLog: ['PRIVATE ANSWER'], stats: {}, masteryFacts: { facts: [], revokedIds: [] },
  auth: { scheme: 'qr-pin-v1', lastLoginAt: 100, pinHash: 'PRIVATE HASH' } })
const response = () => ({ status() { return this }, json(value) { this.data = value; return this } })
beforeEach(() => {
  vi.clearAllMocks(); mock.records.clear(); mock.sets.clear(); mock.allowed.mockResolvedValue(['C'])
  mock.sets.set('classes:index', ['C', 'D', 'X'])
  mock.records.set('class:C', { id: 'C', name: 'Sexan' }); mock.records.set('class:D', { id: 'D', name: 'Sjuan' })
  mock.records.set('class:X', { id: 'X', name: 'Arkiv', archived: true })
  mock.sets.set('class_students:C', ['P']); mock.sets.set('class_students:D', ['OTHER'])
  mock.records.set('student:P', profile('P')); mock.records.set('student:OTHER', profile('OTHER'))
})
it('returns only authorised metadata, then uses warm cards without reading full profiles', async () => {
  const res = response(); await teacherCatalog({}, res)
  expect(res.data.pupils).toMatchObject([{ studentId: 'P', classIds: ['C'], auth: { lastLoginAt: 100, scheme: 'qr-pin-v1' }, catalogOnly: true }])
  expect(JSON.stringify(res.data)).not.toMatch(/PRIVATE|problemLog|pinHash|OTHER/)
  expect(mock.records.get(catalogKey('P')).version).toBe(2)
  kv.mget.mockClear(); await teacherCatalog({}, response())
  expect(kv.mget.mock.calls.flat()).not.toContain('student:P')
  expect(await scopedStudentIds({}, { classIds: ['D'], studentIds: ['OTHER'] })).toEqual([])
  expect(await scopedStudentIds({}, { classIds: ['C'], studentIds: ['P', 'P'] })).toEqual(['P'])
})
it('rebuilds old cards and invalidates metadata after successful profile updates', async () => {
  mock.records.set(catalogKey('P'), { scheme: 'qr-pin-v1' })
  await teacherCatalog({}, response())
  await mutateStudentRecord('P', current => ({ ...current, displayAlias: 'Ny kod', auth: { ...current.auth, lastLoginAt: 200 } }))
  expect(mock.records.has(catalogKey('P'))).toBe(false)
  const res = response(); await teacherCatalog({}, res)
  expect(res.data.pupils[0]).toMatchObject({ displayAlias: 'Ny kod', auth: { lastLoginAt: 200 } })
})
it('omits deleted pupils even if a stale membership and cached card survive', async () => {
  await teacherCatalog({}, response())
  mock.records.set(studentDeletedKey('P'), 'deleted')
  const res = response(); await teacherCatalog({}, res)
  expect(res.data.pupils).toEqual([])
  expect(await scopedStudentIds({}, { classIds: ['C'] })).toEqual([])
})
it('does not recreate a metadata card if pupil deletion happens during cold-cache rebuilding', async () => {
  kv.eval.mockImplementationOnce(async () => { mock.records.set(studentDeletedKey('P'), 'deleted'); return 0 })
  const res = response(); await teacherCatalog({}, res)
  expect(res.data.pupils).toEqual([])
  expect(mock.records.has(catalogKey('P'))).toBe(false)
})
it('does not expose a pupil through a stale former-class index after a class move', async () => {
  await teacherCatalog({}, response())
  await mutateStudentRecord('P', current => ({ ...current, classId: 'D', classIds: ['D'] }))
  const res = response(); await teacherCatalog({}, res)
  expect(res.data.pupils).toEqual([])
})
