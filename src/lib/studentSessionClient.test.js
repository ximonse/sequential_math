import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchStudentSessionProfile, hasStudentSessionCsrfToken, loginStudentSession, logoutStudentSession, postStudentSessionEvents, postStudentSessionHighscore, resumeStudentSession } from './studentSessionClient'

const student = { studentId: 'A'.repeat(32), displayAlias: 'Blå Komet' }
const sessionPayload = { ok: true, student, csrfToken: 'csrf-test-token' }

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => vi.unstubAllGlobals())

describe('student session client', () => {
  it('sends QR credentials only to the login endpoint and remembers only CSRF in module memory', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(sessionPayload, 201))
    vi.stubGlobal('fetch', fetchMock)

    await expect(loginStudentSession({ studentId: ` ${'a'.repeat(32)} `, qrSecret: 'qr-secret', pin: '1234' })).resolves.toEqual({ ok: true, student })
    expect(fetchMock).toHaveBeenCalledWith('/api/student-session', expect.objectContaining({
      method: 'POST', credentials: 'include', body: JSON.stringify({ studentId: 'A'.repeat(32), qrSecret: 'qr-secret', pin: '1234' })
    }))
    expect(hasStudentSessionCsrfToken()).toBe(true)
  })

  it('sends a code name and PIN without QR material when requested', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(sessionPayload, 201))
    vi.stubGlobal('fetch', fetchMock)

    await loginStudentSession({ loginCode: 'Gul Fyr Katt', pin: '1234' })

    expect(fetchMock).toHaveBeenCalledWith('/api/student-session', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ studentId: '', qrSecret: '', loginCode: 'Gul Fyr Katt', pin: '1234' })
    }))
  })

  it('distinguishes rejected credentials from an expired established session', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Inloggningen kunde inte bekräftas.' }, 401)))

    await expect(loginStudentSession({ loginCode: 'Gul Fyr Katt', pin: '9999' })).resolves.toEqual({
      ok: false,
      status: 401,
      error: 'Kodnamnet eller QR-koden och PIN-koden stämmer inte.'
    })
    await expect(resumeStudentSession()).resolves.toEqual({
      ok: false,
      status: 401,
      error: 'Din session har gått ut. Logga in igen.'
    })
  })

  it('resumes a cookie session and sends the in-memory CSRF token for event writes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(sessionPayload))
      .mockResolvedValueOnce(jsonResponse({ ok: true, persisted: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(resumeStudentSession()).resolves.toEqual({ ok: true, student })
    await expect(postStudentSessionEvents([{ id: 'event-1' }])).resolves.toEqual({ ok: true, persisted: 1 })
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/student-session', expect.objectContaining({ method: 'GET', credentials: 'include' }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/me/events', expect.objectContaining({
      credentials: 'include', headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-test-token' })
    }))
  })

  it('clears CSRF after an expired session and does not write events afterwards', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(sessionPayload)))
    await loginStudentSession({ studentId: student.studentId, qrSecret: 'qr-secret', pin: '1234' })
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Inloggningen kunde inte bekräftas.' }, 401)))

    await expect(fetchStudentSessionProfile()).resolves.toMatchObject({ ok: false, error: expect.stringContaining('gått ut'), status: 401 })
    expect(hasStudentSessionCsrfToken()).toBe(false)
    await expect(postStudentSessionEvents([])).resolves.toEqual({ ok: false, error: 'Din session har gått ut. Logga in igen.' })
  })

  it('uses the CSRF token for logout and always clears it locally', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(sessionPayload, 201))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await loginStudentSession({ studentId: student.studentId, qrSecret: 'qr-secret', pin: '1234' })

    await expect(logoutStudentSession()).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/student-session', expect.objectContaining({
      method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-Token': 'csrf-test-token' }
    }))
    expect(hasStudentSessionCsrfToken()).toBe(false)
  })

  it('returns useful HTTP and network errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Slow down' }, 429)))
    await expect(loginStudentSession({ studentId: student.studentId, qrSecret: 'qr-secret', pin: '1234' })).resolves.toMatchObject({ ok: false, status: 429, error: expect.stringContaining('För många') })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await expect(resumeStudentSession()).resolves.toMatchObject({ ok: false, error: expect.stringContaining('anslutningen') })
  })

  it('submits a highscore without client-controlled pupil identity', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(sessionPayload, 201))
      .mockResolvedValueOnce(jsonResponse({ qualified: true, rank: 2, highscores: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await loginStudentSession({ studentId: student.studentId, qrSecret: 'qr-secret', pin: '1234' })

    await expect(postStudentSessionHighscore({ game: 'pong', score: 14, classId: 'class-a' }))
      .resolves.toMatchObject({ ok: true, qualified: true, rank: 2 })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/highscores', expect.objectContaining({
      method: 'POST', credentials: 'include',
      body: JSON.stringify({ game: 'pong', score: 14, classId: 'class-a' }),
      headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-test-token' })
    }))
  })
})
