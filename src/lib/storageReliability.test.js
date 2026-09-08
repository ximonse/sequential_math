import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCloudSyncApi } from './storageCloudSync'
import { cancelAllRetries, addPendingSync } from './storageCloudSyncQueue'
import { appendToWal, getUnsynced } from './syncWal'
import { createStudentProfile } from './studentProfile'
import { toTeacherListProfile } from './teacherListProfile'

let local, api
const response = data => ({ ok: true, status: 200, json: async () => data })
beforeEach(() => {
  const data = new Map()
  vi.stubGlobal('localStorage', { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) })
  local = createStudentProfile('TEST', 'Synthetic', 4)
  api = createCloudSyncApi({ CLOUD_ENABLED: true, CLOUD_PROFILE_SYNC_THROTTLE_MS: 30000,
    normalizeStudentId: id => String(id).toUpperCase(), getTeacherApiToken: () => 'synthetic.token',
    getActiveStudentSessionSecret: () => '', getAllProfiles: () => local ? [structuredClone(local)] : [],
    loadProfile: () => local ? structuredClone(local) : null,
    saveProfileLocalOnly: profile => { local = structuredClone(profile) },
    normalizeLoadedProfile: profile => profile })
})
afterEach(() => { cancelAllRetries(); vi.unstubAllGlobals() })

describe('client persistence boundaries', () => {
  it('does not replace newer work when an old response arrives', async () => {
    let resolve
    vi.stubGlobal('fetch', vi.fn(() => new Promise(done => { resolve = done })))
    const first = api.requestCloudSync(local, { forceSync: true })
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    expect(api.getSyncHealth().hasPending).toBe(true)
    const old = structuredClone(local)
    local.problemLog.push({ problemId: 'new-answer' })
    api.requestCloudSync(local, { forceSync: true })
    expect(fetch).toHaveBeenCalledTimes(1)
    resolve(response({ profile: old }))
    await first
    expect(local.problemLog).toEqual([{ problemId: 'new-answer' }])
    expect(api.getSyncHealth().hasPending).toBe(true)
    vi.stubGlobal('fetch', vi.fn(async () => response({ profile: local })))
    expect(await api.flushPendingSyncs()).toEqual({ flushed: 1, failed: 0 })
    expect(api.getSyncHealth().hasPending).toBe(false)
  })

  it('recovers more than 100 offline events in acknowledged batches', async () => {
    for (let i = 0; i < 205; i++) appendToWal({ id: `event-${i}`, studentId: 'TEST', payload: {}, syncedAt: null })
    const sizes = []
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      const body = JSON.parse(options.body)
      if (url.endsWith('/events')) {
        sizes.push(body.entries.length)
        return response({ ack: body.entries.map(entry => entry.id) })
      }
      return response({ profile: body.profile })
    }))
    await api.requestCloudSync(local, { forceSync: true })
    expect(sizes).toEqual([100, 100, 5])
    expect(getUnsynced('TEST')).toHaveLength(0)
    expect(api.getSyncHealth().hasPending).toBe(false)
  })

  it('keeps failed requests pending and does not accept unrelated event acknowledgements', async () => {
    appendToWal({ id: 'event', studentId: 'TEST', syncedAt: null })
    vi.stubGlobal('fetch', vi.fn(async url => url.endsWith('/events')
      ? response({ ack: ['not-submitted'] }) : { ok: false, status: 503 }))
    await api.requestCloudSync(local, { forceSync: true })
    expect(getUnsynced('TEST')).toHaveLength(1)
    expect(api.getSyncHealth().hasPending).toBe(true)
  })

  it('uses server list contracts without combining stale local pupils or leaking them on failure', async () => {
    const dto = toTeacherListProfile(createStudentProfile('REMOTE', 'Other', 4))
    vi.stubGlobal('fetch', vi.fn(async () => response({ profiles: [dto] })))
    const list = await api.getAllProfilesWithSync()
    expect(list.map(profile => profile.studentId)).toEqual(['REMOTE'])
    expect(list[0].problemLog).toBeUndefined()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })))
    expect(await api.getAllProfilesWithSync()).toEqual([])
  })

  it('does not restore a locally deleted pupil from an in-flight response', async () => {
    let resolve
    vi.stubGlobal('fetch', vi.fn((url, options) => options.method === 'DELETE'
      ? Promise.resolve(response({ ok: true })) : new Promise(done => { resolve = done })))
    const old = structuredClone(local)
    const saving = api.requestCloudSync(local, { forceSync: true })
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    expect(await api.deleteProfileFromCloud('TEST')).toEqual({ ok: true })
    local = null
    resolve(response({ profile: old }))
    await saving
    expect(local).toBeNull()
    expect(api.getSyncHealth().hasPending).toBe(false)
  })

  it('uses authenticated keepalive requests when leaving the page and retains the queue', () => {
    addPendingSync('TEST', local)
    vi.stubGlobal('fetch', vi.fn(async () => response({})))
    api.attemptBeforeUnloadSync()
    expect(fetch.mock.calls[0][1]).toMatchObject({ keepalive: true, headers: { 'x-teacher-token': 'synthetic.token' } })
    expect(api.getSyncHealth().hasPending).toBe(true)
  })
})
