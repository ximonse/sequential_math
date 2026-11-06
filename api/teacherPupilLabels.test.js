import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emulatePupilLifecycle } from './testHelpers/pupilLifecycleKv.js'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  mget: vi.fn(async (...keys) => keys.map(key => structuredClone(records.get(key) ?? null))),
  eval: vi.fn(async (script, keys, args) => emulatePupilLifecycle(records, script, keys, args)?.result),
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

  it('batches normal teacher profile reads and retains exact order and scope when a batch fails', async () => {
    const ids = Array.from({ length: 40 }, (_, i) => `PUPIL-${i}`)
    const labels = Object.fromEntries(ids.map(id => [id, `Private ${id}`]))
    records.set('teacher_pupil_labels:teacher-a', labels)
    for (const id of ids) records.set(`student:${id}`, { classId: 'CLASS-A' })
    const result = await call('GET', { teacherId: 'teacher-a', role: 'teacher' })
    expect(result.data.labels).toEqual(labels)
    expect(kv.mget).toHaveBeenCalledTimes(8)
    expect(kv.mget.mock.calls.every(keys => keys.length <= 5)).toBe(true)
    expect(kv.get.mock.calls.map(([key]) => key)).toEqual(['teacher_pupil_labels:teacher-a'])
    kv.mget.mockRejectedValueOnce(Error('Synthetic response limit'))
    expect((await call('GET', { teacherId: 'teacher-a', role: 'teacher' })).data.labels).toEqual(labels)
    expect(kv.get.mock.calls.slice(2).map(([key]) => key)).toEqual(ids.slice(0, 5).map(id => `student:${id}`))
  })

  it('denies a result if school scope changes while the class authorization is read', async () => {
    records.set('teacher_pupil_labels:teacher-a', { 'PUPIL-1': 'Private' })
    getLiveTeacherAuthPayload.mockResolvedValueOnce({ teacherId: 'teacher-a', role: 'school_admin', schoolIds: ['SCHOOL'] })
      .mockResolvedValueOnce({ teacherId: 'teacher-a', role: 'school_admin', schoolIds: ['SCHOOL'] })
      .mockResolvedValueOnce({ teacherId: 'teacher-a', role: 'school_admin', schoolIds: [] })
    expect((await call('GET', { teacherId: 'teacher-a', role: 'school_admin' })).data.labels).toEqual({})
  })
})
