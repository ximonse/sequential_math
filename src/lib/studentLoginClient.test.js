import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveStudentLogin } from './studentLoginClient'
afterEach(() => vi.unstubAllGlobals())

describe('student login requests', () => {
  it('posts only name or ID and the unchanged password', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ studentId: 'ANNA_HASH' })))
    vi.stubGlobal('fetch', fetchMock)
    expect(await resolveStudentLogin(' Anna ', ' Secret ')).toEqual({ ok: true, studentId: 'ANNA_HASH' })
    expect(fetchMock).toHaveBeenCalledWith('/api/student-login', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Anna', password: ' Secret ' })
    }))
  })
  it('preserves the server explanation for duplicate names', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Använd elev-ID' }), { status: 409 })))
    expect(await resolveStudentLogin('Anna', 'Anna')).toEqual({ ok: false, error: 'Använd elev-ID' })
  })
  it('reports unavailable service instead of treating it as a missing pupil', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await resolveStudentLogin('Anna', 'Anna')).toMatchObject({ ok: false, error: expect.stringContaining('anslutningen') })
  })
  it('rejects malformed lookup responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    expect(await resolveStudentLogin('Anna', 'Anna')).toMatchObject({ ok: false })
  })
})
