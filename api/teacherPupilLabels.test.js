import { beforeEach, describe, expect, it, vi } from 'vitest'

const records = vi.hoisted(() => new Map())
vi.mock('@vercel/kv', () => ({ kv: {
  get: vi.fn(async key => structuredClone(records.get(key) ?? null)),
  set: vi.fn(async (key, value) => records.set(key, structuredClone(value))),
  smembers: vi.fn(async key => structuredClone(records.get(key) ?? []))
} }))
vi.mock('./_helpers.js', () => ({
  getLiveTeacherAuthPayload: vi.fn(async req => req.auth || null),
  withCors: vi.fn()
}))
const accessMock = vi.hoisted(() => vi.fn())
vi.mock('./_studentAccess.js', () => ({
  assertTeacherStudentAccess: accessMock
}))
const defaultAccess = vi.hoisted(() => (async (req, profile) => {
  if (!profile || !profile.allowedTeacherIds?.includes(req.auth?.teacherId)) {
    throw Object.assign(new Error('Not authorized for this student'), { status: 403 })
  }
}))

import handler from './teacher-pupil-labels.js'

async function call(method, auth, body = {}) {
  const res = { code: 200, status(code) { this.code = code; return this }, json(data) { this.data = data; return this }, end() { return this } }
  await handler({ method, auth, body, headers: {} }, res)
  return res
}

describe('teacher pupil labels', () => {
  beforeEach(() => {
    accessMock.mockReset()
    accessMock.mockImplementation(defaultAccess)
    records.clear()
    records.set('student:PUPIL-1', { allowedTeacherIds: ['teacher-a'] })
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
    records.set('student:PUPIL-1', { allowedTeacherIds: ['teacher-a'], preferredName: 'Alva', displayAlias: 'Blå Räv' })
    records.set('student:PUPIL-2', { allowedTeacherIds: ['teacher-b'], preferredName: 'Bo', displayAlias: 'Gul Fyr' })

    const filled = await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names' })

    expect(filled).toMatchObject({ code: 200, data: { ok: true, added: 1, labels: { 'PUPIL-1': 'Alva' } } })
    expect(filled.data.labels['PUPIL-2']).toBeUndefined()
  })

  it('skriver inte över ett tilltalsnamn läraren redan valt', async () => {
    records.set('students:index', ['PUPIL-1'])
    records.set('student:PUPIL-1', { allowedTeacherIds: ['teacher-a'], preferredName: 'Alva', displayAlias: 'Blå Räv' })
    await call('PUT', { teacherId: 'teacher-a' }, { studentId: 'PUPIL-1', label: 'Alva S' })

    const filled = await call('POST', { teacherId: 'teacher-a' }, { action: 'fill_from_creation_names' })

    expect(filled.data).toMatchObject({ added: 0, labels: { 'PUPIL-1': 'Alva S' } })
  })

  it('avvisar en okänd åtgärd', async () => {
    expect((await call('POST', { teacherId: 'teacher-a' }, { action: 'annat' })).code).toBe(400)
  })

  it('läser en hel klass etiketter parallellt och behåller behörighetskontrollen', async () => {
    const mine = Array.from({ length: 30 }, (_, index) => `PUPIL-MINE-${index}`)
    const theirs = Array.from({ length: 30 }, (_, index) => `PUPIL-OTHER-${index}`)
    const labels = {}
    for (const id of mine) {
      records.set(`student:${id}`, { allowedTeacherIds: ['teacher-a'] })
      labels[id] = `Namn ${id}`
    }
    for (const id of theirs) {
      records.set(`student:${id}`, { allowedTeacherIds: ['teacher-b'] })
      labels[id] = `Namn ${id}`
    }
    records.set('teacher_pupil_labels:teacher-a', labels)

    let concurrent = 0
    let peakConcurrent = 0
    accessMock.mockImplementation(async (req, profile) => {
      concurrent += 1
      peakConcurrent = Math.max(peakConcurrent, concurrent)
      await new Promise(resolve => setTimeout(resolve, 1))
      concurrent -= 1
      if (!profile?.allowedTeacherIds?.includes(req.auth?.teacherId)) {
        throw Object.assign(new Error('Not authorized for this student'), { status: 403 })
      }
    })

    const read = await call('GET', { teacherId: 'teacher-a' })

    expect(Object.keys(read.data.labels)).toHaveLength(30)
    expect(read.data.labels['PUPIL-OTHER-0']).toBeUndefined()
    expect(peakConcurrent).toBeGreaterThan(1)
  })
})
