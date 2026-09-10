import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadStudentLoginClasses, resolveClassStudentId } from './studentLoginClient'
afterEach(() => vi.unstubAllGlobals())

describe('student login requests', () => {
  it('posts class, display name and unchanged password without putting credentials in the URL', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ studentId: 'ANNA_HASH' })))
    vi.stubGlobal('fetch', fetchMock)
    expect(await resolveClassStudentId('class-6a', ' Anna ', ' Secret ')).toEqual({ ok: true, studentId: 'ANNA_HASH' })
    expect(fetchMock).toHaveBeenCalledWith('/api/student-login', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ classId: 'class-6a', name: 'Anna', password: ' Secret ', schoolId: '' })
    }))
  })
  it('preserves the server explanation for duplicate names', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Använd elev-ID' }), { status: 409 })))
    expect(await resolveClassStudentId('a', 'Anna', 'Anna')).toEqual({ ok: false, error: 'Använd elev-ID' })
  })
  it('reports unavailable service instead of treating it as a missing pupil', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await resolveClassStudentId('a', 'Anna', 'Anna')).toMatchObject({ ok: false, error: expect.stringContaining('anslutningen') })
    await expect(loadStudentLoginClasses()).rejects.toThrow()
  })
  it('rejects malformed lookup responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    expect(await resolveClassStudentId('a', 'Anna', 'Anna')).toMatchObject({ ok: false })
    await expect(loadStudentLoginClasses()).rejects.toThrow()
  })
})
