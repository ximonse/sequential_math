import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveStudentLogin } from './studentLoginClient'
afterEach(() => vi.unstubAllGlobals())
const assignment = { classId: 'class-a', className: '6A', schoolId: 'north', schoolName: 'Ribbaskolan' }

describe('student login requests', () => {
  it('posts only name or ID and the unchanged password, then returns assigned groups', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ studentId: 'ANNA_HASH', assignments: [assignment] })))
    vi.stubGlobal('fetch', fetchMock)
    expect(await resolveStudentLogin(' Anna ', ' Secret ')).toEqual({ ok: true, studentId: 'ANNA_HASH', assignments: [assignment] })
    expect(fetchMock).toHaveBeenCalledWith('/api/student-login', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Anna', password: ' Secret ' })
    }))
  })
  it('preserves the server explanation for duplicate names', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Use ID' }), { status: 409 })))
    expect(await resolveStudentLogin('Anna', 'Anna')).toEqual({ ok: false, error: 'Use ID' })
  })
  it('rejects a response without teacher-assigned groups', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ studentId: 'ANNA_HASH', assignments: [] }))))
    expect(await resolveStudentLogin('Anna', 'Anna')).toMatchObject({ ok: false })
  })
  it('reports unavailable service instead of treating it as a missing pupil', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await resolveStudentLogin('Anna', 'Anna')).toMatchObject({ ok: false, error: expect.stringContaining('anslutningen') })
  })
})
