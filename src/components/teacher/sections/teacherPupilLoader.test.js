import { expect, it, vi } from 'vitest'
import { createTeacherPupilLoader } from './teacherPupilLoader'

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const catalog = ['A', 'B'].map(id => ({ studentId: id, classId: id, catalogOnly: true }))
it('retains results for a successfully loaded scope during refresh and a transient history error, but never for another scope', async () => {
  const slow = deferred()
  const request = vi.fn().mockResolvedValueOnce([{ studentId: 'A', classId: 'A', stats: { totalProblems: 25 }, teacherSummary: { effectiveLevels: { addition: 3 } } }])
    .mockReturnValueOnce(slow.promise).mockRejectedValueOnce(Error('Network'))
  const { loader, publish, onState } = fixture(request)
  await loader.replaceCatalog(catalog)
  await loader.select({ classIds: ['A'] })
  const refresh = loader.replaceCatalog(catalog)
  expect(onState.mock.lastCall[0]).toMatchObject({ status: 'loading', hasData: true })
  expect(publish.mock.lastCall[0][0]).toMatchObject({ catalogOnly: false, stats: { totalProblems: 25 }, teacherSummary: { effectiveLevels: { addition: 3 } } })
  slow.reject(Error('Offline')); await refresh
  expect(onState.mock.lastCall[0]).toMatchObject({ status: 'error', hasData: true })
  await loader.select({ classIds: ['B'] })
  expect(onState.mock.lastCall[0]).toMatchObject({ status: 'error', hasData: false })
  expect(publish.mock.lastCall[0].every(profile => profile.catalogOnly)).toBe(true)
})

it('does not retain results for members removed from a refreshed catalog', async () => {
  const { loader, publish } = fixture(vi.fn().mockResolvedValueOnce([{ studentId: 'A', classId: 'A', recentProblems: ['A'] }]).mockResolvedValueOnce([]))
  await loader.replaceCatalog(catalog)
  await loader.select({ classIds: ['A'] })
  await loader.replaceCatalog([catalog[1]])
  expect(publish.mock.calls.slice(-2).every(([profiles]) => !profiles.some(profile => profile.studentId === 'A' && profile.recentProblems))).toBe(true)
})
function fixture(loadProfiles = vi.fn(async scope => scope.classIds.map(id => ({ studentId: id, classId: id, recentProblems: [id] })))) {
  const publish = vi.fn(), onState = vi.fn()
  return { loader: createTeacherPupilLoader({ loadProfiles, publish, onState }), loadProfiles, publish, onState }
}
it('publishes catalog metadata without reading history, then only the current choice on refresh', async () => {
  const { loader, loadProfiles, publish } = fixture()
  await loader.replaceCatalog(catalog)
  expect(loadProfiles).not.toHaveBeenCalled()
  await loader.select({ classIds: ['A'] })
  await loader.select({ classIds: ['B'] })
  await loader.replaceCatalog(catalog)
  expect(loadProfiles.mock.calls.map(([scope]) => scope.classIds)).toEqual([['A'], ['B'], ['B']])
  expect(publish.mock.lastCall[0][0].catalogOnly).toBe(true)
  expect(publish.mock.lastCall[0][1].recentProblems).toEqual(['B'])
})
it('ignores late success and failure from older choices and catalog generations', async () => {
  const old = deferred(), current = deferred(), fresh = deferred()
  const request = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise).mockReturnValueOnce(fresh.promise)
  const { loader, publish, onState } = fixture(request)
  await loader.replaceCatalog(catalog)
  const a = loader.select({ classIds: ['A'] })
  const b = loader.select({ classIds: ['B'] })
  old.resolve([{ studentId: 'A', classId: 'A' }]); await a
  expect(onState.mock.lastCall[0].status).toBe('loading')
  const refreshed = loader.replaceCatalog(catalog)
  fresh.resolve([{ studentId: 'B', classId: 'B', serverRevision: 2 }]); await refreshed
  current.reject(Error('Old error')); await b
  expect(onState.mock.lastCall[0].status).toBe('ready')
  expect(publish.mock.lastCall[0][1].serverRevision).toBe(2)
})
it('deduplicates identical scope requests, keeps errors explicit, and retries on demand', async () => {
  const pending = deferred(), request = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue([{ studentId: 'A', classId: 'A' }])
  const { loader, onState } = fixture(request)
  await loader.replaceCatalog(catalog)
  const first = loader.select({ classIds: ['A'] })
  const same = loader.select({ classIds: ['A', 'A'] })
  pending.reject(Error('Offline')); await Promise.all([first, same])
  expect(request).toHaveBeenCalledTimes(1)
  expect(onState.mock.lastCall[0]).toMatchObject({ status: 'error', error: 'Offline' })
  await loader.reload()
  expect(onState.mock.lastCall[0].status).toBe('ready')
})
it('rejects incomplete results rather than inventing zero results for missing pupils', async () => {
  const { loader, onState, publish } = fixture(vi.fn(async () => []))
  await loader.replaceCatalog(catalog)
  await loader.select({ classIds: ['A'] })
  expect(onState.mock.lastCall[0].status).toBe('error')
  expect(publish.mock.lastCall[0].every(profile => profile.catalogOnly)).toBe(true)
})
it('clears prior data on catalog failure and ignores an already pending history reply', async () => {
  const pending = deferred()
  const { loader, onState, publish } = fixture(vi.fn(() => pending.promise))
  await loader.replaceCatalog(catalog)
  const selected = loader.select({ classIds: ['A'] })
  loader.failCatalog(Error('Authorization expired'))
  pending.resolve([{ studentId: 'A', classId: 'A' }]); await selected
  expect(publish.mock.lastCall[0]).toEqual([])
  expect(onState.mock.lastCall[0]).toMatchObject({ status: 'error', error: 'Authorization expired' })
})
it('includes an authorised new class member returned after the catalog was read', async () => {
  const { loader, publish } = fixture(vi.fn(async () => [{ studentId: 'A', classId: 'A' }, { studentId: 'NEW', classId: 'A' }]))
  await loader.replaceCatalog(catalog)
  await loader.select({ classIds: ['A'] })
  expect(publish.mock.lastCall[0].map(profile => profile.studentId)).toEqual(['A', 'B', 'NEW'])
})
