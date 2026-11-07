import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emulatePupilLifecycle } from './testHelpers/pupilLifecycleKv.js'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  mget: vi.fn(async (...keys) => keys.map(key => structuredClone(records.get(key) ?? null))),
  eval: vi.fn(async (script, keys, args) => {
    if (script === CLASS_AUDIENCE_PROFILES) return keys.map(key => {
      const profile = records.get(key)
      if (!profile || !(args[0] === '' || profile.classId === args[0] || profile.classIds?.includes(args[0]))) return null
      const { studentId, displayAlias, classId, classIds } = profile
      return JSON.stringify({ studentId, displayAlias, classId, classIds })
    })
    return emulatePupilLifecycle(records, script, keys, args)?.result
  }),
  set: vi.fn(async (key, value) => records.set(key, structuredClone(value))),
  smembers: vi.fn(async key => structuredClone(records.get(key) ?? []))
} }))
vi.mock('./_helpers.js', () => ({
  getLiveTeacherAuthPayload: vi.fn(async req => req.auth || null),
  withCors: vi.fn()
}))
const accessMock = vi.hoisted(() => vi.fn())
const classAccessMock = vi.hoisted(() => vi.fn())
vi.mock('./_studentAccess.js', () => ({
  assertTeacherStudentAccess: accessMock,
  canAccessClass: classAccessMock
}))
const defaultAccess = vi.hoisted(() => (async (req, profile) => {
  if (!profile || !profile.allowedTeacherIds?.includes(req.auth?.teacherId)) {
    throw Object.assign(new Error('Not authorized for this student'), { status: 403 })
  }
}))

import handler from './teacher-pupil-labels.js'
import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { CLASS_AUDIENCE_PROFILES } from './_audienceProfileBatch.js'

async function call(method, auth, body = {}) {
  const res = { code: 200, status(code) { this.code = code; return this }, json(data) { this.data = data; return this }, end() { return this } }
  await handler({ method, auth, body, headers: {} }, res)
  return res
}

describe('teacher pupil labels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLiveTeacherAuthPayload.mockReset().mockImplementation(async req => req.auth || null)
    accessMock.mockReset()
    accessMock.mockImplementation(defaultAccess)
    classAccessMock.mockReset().mockImplementation(async (req, id) => id === (req.auth?.teacherId === 'teacher-a' ? 'CLASS-A' : 'CLASS-B'))
    records.clear()
    records.set('student:PUPIL-1', { classId: 'CLASS-A', allowedTeacherIds: ['teacher-a'] })
  })

  it('reads the super admin own labels without fetching every pupil profile or checking auth per label', async () => {
    const labels = Object.fromEntries(Array.from({ length: 680 }, (_, i) => [`PUPIL-${i}`, `Private ${i}`]))
    records.set('teacher_pupil_labels:teacher-a', labels)
    for (const id of Object.keys(labels)) records.set(`student:${id}`, { allowedTeacherIds: ['teacher-a'] })
    const result = await call('GET', { teacherId: 'teacher-a', role: 'super_admin' })
    expect(result.data.labels).toEqual(labels)
    expect(kv.get.mock.calls.map(([key]) => key)).toEqual(['teacher_pupil_labels:teacher-a'])
    expect(accessMock).not.toHaveBeenCalled()
    expect(getLiveTeacherAuthPayload).toHaveBeenCalledTimes(2)
  })

  it('does not return labels when the live teacher identity is revoked after initial authorization', async () => {
    records.set('teacher_pupil_labels:teacher-a', { 'PUPIL-1': 'Private' })
    getLiveTeacherAuthPayload.mockResolvedValueOnce({ teacherId: 'teacher-a', role: 'super_admin' }).mockResolvedValueOnce(null)
    expect((await call('GET', { teacherId: 'teacher-a', role: 'super_admin' })).data.labels).toEqual({})
  })

  it('falls back to pupil scope checks when the live super admin role has been removed', async () => {
    records.set('teacher_pupil_labels:teacher-a', { 'PUPIL-1': 'Mine', 'PUPIL-2': 'Other' })
    records.set('student:PUPIL-2', { classId: 'CLASS-B', allowedTeacherIds: ['teacher-b'] })
    getLiveTeacherAuthPayload.mockResolvedValueOnce({ teacherId: 'teacher-a', role: 'super_admin' })
      .mockResolvedValue({ teacherId: 'teacher-a', role: 'teacher' })
    expect((await call('GET', { teacherId: 'teacher-a', role: 'super_admin' })).data.labels).toEqual({ 'PUPIL-1': 'Mine' })
    expect(classAccessMock).toHaveBeenCalledTimes(2)
  })

  it('stores a label privately per teacher after checking pupil access', async () => {
    const saved = await call('PUT', { teacherId: 'teacher-a' }, { studentId: 'PUPIL-1', label: 'Alex' })
    expect(saved).toMatchObject({ code: 200, data: { ok: true, labels: { 'PUPIL-1': 'Alex' } } })
    expect((await call('GET', { teacherId: 'teacher-b' })).data.labels).toEqual({})
  })

  it('rejects a label for a pupil outside the teacher scope', async () => {
    expect((await call('PUT', { teacherId: 'teacher-b' }, { studentId: 'PUPIL-1', label: 'Alex' })).code).toBe(403)
  })

  it('fyller tomma etiketter från skapandenamnen inom lärarens räckvidd', async () => {
    records.set('students:index', ['PUPIL-1', 'PUPIL-2'])
    records.set('student:PUPIL-1', { classId: 'CLASS-A', allowedTeacherIds: ['teacher-a'], preferredName: 'Alva', displayAlias: 'Blå Räv' })
    records.set('student:PUPIL-2', { classId: 'CLASS-B', allowedTeacherIds: ['teacher-b'], preferredName: 'Bo', displayAlias: 'Gul Fyr' })

    const filled = await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names' })

    expect(filled).toMatchObject({ code: 200, data: { ok: true, added: 1, labels: { 'PUPIL-1': 'Alva' } } })
    expect(filled.data.labels['PUPIL-2']).toBeUndefined()
  })

  it('skriver inte över ett tilltalsnamn läraren redan valt', async () => {
    records.set('students:index', ['PUPIL-1'])
    records.set('student:PUPIL-1', { classId: 'CLASS-A', allowedTeacherIds: ['teacher-a'], preferredName: 'Alva', displayAlias: 'Blå Räv' })
    await call('PUT', { teacherId: 'teacher-a' }, { studentId: 'PUPIL-1', label: 'Alva S' })

    const filled = await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names' })

    expect(filled.data).toMatchObject({ added: 0, labels: { 'PUPIL-1': 'Alva S' } })
  })

  it('avvisar en okänd åtgärd', async () => {
    expect((await call('POST', { teacherId: 'teacher-a' }, { action: 'annat' })).code).toBe(400)
  })

  it('skips global profile reads when the stored label list has already reached its limit', async () => {
    const labels = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`PUPIL-${i}`, `Private ${i}`]))
    records.set('teacher_pupil_labels:teacher-a', labels)
    records.set('students:index', ['UNNEEDED'])
    const result = await call('POST', { teacherId: 'teacher-a', role: 'super_admin' }, { action: 'fill_from_creation_names' })
    expect(result.data).toMatchObject({ ok: true, added: 0, labels })
    expect(kv.smembers).not.toHaveBeenCalled()
    expect(kv.mget).not.toHaveBeenCalled()
    expect(kv.get.mock.calls.every(([key]) => key === 'teacher_pupil_labels:teacher-a')).toBe(true)
  })

  it('reads only explicitly requested missing pupils and preserves existing labels', async () => {
    records.set('students:index', ['PUPIL-1', 'PUPIL-2', 'UNRELATED'])
    records.set('teacher_pupil_labels:teacher-a', { 'PUPIL-1': 'Chosen name' })
    records.set('student:PUPIL-2', { classId: 'CLASS-A', allowedTeacherIds: ['teacher-a'], preferredName: 'New name' })
    const result = await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names', studentIds: ['PUPIL-1', 'PUPIL-2'] })
    expect(result.data).toMatchObject({ added: 1, labels: { 'PUPIL-1': 'Chosen name', 'PUPIL-2': 'New name' } })
    expect(kv.smembers).not.toHaveBeenCalled()
    expect(kv.mget.mock.calls.flat()).toEqual(['student:PUPIL-2'])
  })

  it('treats an empty explicit selection as no work and rejects malformed selections', async () => {
    const result = await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names', studentIds: [] })
    expect(result.data).toMatchObject({ added: 0, labels: {} })
    for (const studentIds of [null, 'PUPIL-1', [123], ['bad!']]) {
      expect((await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names', studentIds })).code).toBe(400)
    }
    expect(kv.smembers).not.toHaveBeenCalled()
    expect(kv.mget).not.toHaveBeenCalled()
  })

  it('filters a whole label list using current pupil membership and shared live class authorization', async () => {
    const mine = Array.from({ length: 30 }, (_, index) => `PUPIL-MINE-${index}`)
    const theirs = Array.from({ length: 30 }, (_, index) => `PUPIL-OTHER-${index}`)
    const labels = {}
    for (const id of mine) {
      records.set(`student:${id}`, { classId: 'CLASS-A', allowedTeacherIds: ['teacher-a'] })
      labels[id] = `Namn ${id}`
    }
    for (const id of theirs) {
      records.set(`student:${id}`, { classId: 'CLASS-B', allowedTeacherIds: ['teacher-b'] })
      labels[id] = `Namn ${id}`
    }
    records.set('teacher_pupil_labels:teacher-a', labels)

    const read = await call('GET', { teacherId: 'teacher-a' })

    expect(Object.keys(read.data.labels)).toHaveLength(30)
    expect(read.data.labels['PUPIL-OTHER-0']).toBeUndefined()
    expect(classAccessMock).toHaveBeenCalledTimes(2)
    expect(accessMock).not.toHaveBeenCalled()
    expect(getLiveTeacherAuthPayload).toHaveBeenCalledTimes(3)
  })

  it('projects only memberships for normal teachers and retains exact labels when a batch splits', async () => {
    const ids = Array.from({ length: 40 }, (_, i) => `PUPIL-${i}`)
    const labels = Object.fromEntries(ids.map(id => [id, `Private ${id}`]))
    records.set('teacher_pupil_labels:teacher-a', labels)
    for (const id of ids) records.set(`student:${id}`, { classId: 'CLASS-A', problemLog: ['PRIVATE ANSWER'], auth: { pin: 'PRIVATE PIN' } })
    const result = await call('GET', { teacherId: 'teacher-a', role: 'teacher' })
    expect(result.data.labels).toEqual(labels)
    expect(kv.eval).toHaveBeenCalledTimes(4)
    expect(kv.eval.mock.calls[0][0]).toBe(CLASS_AUDIENCE_PROFILES)
    expect(kv.eval.mock.calls[0][2]).toEqual([''])
    expect(kv.mget).not.toHaveBeenCalled()
    expect(kv.get.mock.calls.map(([key]) => key)).toEqual(['teacher_pupil_labels:teacher-a'])
    kv.eval.mockRejectedValueOnce(Error('Synthetic response size exceeded'))
    expect((await call('GET', { teacherId: 'teacher-a', role: 'teacher' })).data.labels).toEqual(labels)
    expect(kv.get.mock.calls.map(([key]) => key)).toEqual(['teacher_pupil_labels:teacher-a', 'teacher_pupil_labels:teacher-a'])
    expect(kv.eval.mock.calls.every(([, keys, args]) => keys.length <= 10 && args[0] === '')).toBe(true)
  })

  it('avoids repeatedly crossing the observed storage script budget before splitting', async () => {
    const ids = Array.from({ length: 40 }, (_, i) => `PUPIL-${i}`)
    const labels = Object.fromEntries(ids.map(id => [id, `Private ${id}`]))
    records.set('teacher_pupil_labels:teacher-a', labels)
    for (const id of ids) records.set(`student:${id}`, { classId: 'CLASS-A' })
    const original = kv.eval.getMockImplementation()
    let overBudget = 0, active = 0, peak = 0
    kv.eval.mockImplementation(async (script, keys, args) => {
      if (script === CLASS_AUDIENCE_PROFILES && keys.length > 10) {
        overBudget++; throw Error('script execution timed out')
      }
      active++; peak = Math.max(peak, active)
      try {
        await new Promise(resolve => setTimeout(resolve, 1))
        return await original(script, keys, args)
      } finally { active-- }
    })
    try {
      expect((await call('GET', { teacherId: 'teacher-a', role: 'teacher' })).data.labels).toEqual(labels)
      expect(overBudget).toBe(0)
      expect(peak).toBeGreaterThan(1)
      expect(peak).toBeLessThanOrEqual(4)
    } finally { kv.eval.mockImplementation(original) }
  })

  it('denies a result if school scope changes while the class authorization is read', async () => {
    records.set('teacher_pupil_labels:teacher-a', { 'PUPIL-1': 'Private' })
    getLiveTeacherAuthPayload.mockResolvedValueOnce({ teacherId: 'teacher-a', role: 'school_admin', schoolIds: ['SCHOOL'] })
      .mockResolvedValueOnce({ teacherId: 'teacher-a', role: 'school_admin', schoolIds: ['SCHOOL'] })
      .mockResolvedValueOnce({ teacherId: 'teacher-a', role: 'school_admin', schoolIds: [] })
    expect((await call('GET', { teacherId: 'teacher-a', role: 'school_admin' })).data.labels).toEqual({})
  })
})
