let csrfToken = null

const SESSION_EXPIRED_ERROR = 'Din session har gått ut. Logga in igen.'

function clearCsrfToken() {
  csrfToken = null
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function errorForResponse(response, data, fallback) {
  if (response.status === 401 || response.status === 403) {
    clearCsrfToken()
    return SESSION_EXPIRED_ERROR
  }
  if (response.status === 429) return 'För många försök. Vänta en stund och försök igen.'
  if (typeof data?.error === 'string' && data.error.trim()) return data.error
  return fallback
}

function validSessionPayload(data) {
  return data?.ok === true
    && typeof data?.student?.studentId === 'string' && data.student.studentId.trim()
    && typeof data?.csrfToken === 'string' && data.csrfToken.trim()
}

async function requestSession(url, options, fallback) {
  try {
    const response = await fetch(url, { credentials: 'include', ...options })
    const data = await readJson(response)
    if (!response.ok) return { ok: false, error: errorForResponse(response, data, fallback), status: response.status }
    return { ok: true, data, status: response.status }
  } catch {
    return { ok: false, error: 'Kunde inte nå tjänsten. Kontrollera anslutningen och försök igen.' }
  }
}

function rememberSession(data) {
  if (!validSessionPayload(data)) {
    clearCsrfToken()
    return { ok: false, error: 'Inloggningen gav ett ogiltigt svar. Försök igen.' }
  }
  csrfToken = data.csrfToken
  return { ok: true, student: data.student }
}

export async function loginStudentSession({ studentId, qrSecret, pin }) {
  clearCsrfToken()
  const result = await requestSession('/api/student-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: String(studentId || '').trim().toUpperCase(), qrSecret: String(qrSecret || ''), pin: String(pin || '') })
  }, 'Kunde inte logga in.')
  if (!result.ok) return result
  return rememberSession(result.data)
}

export async function resumeStudentSession() {
  clearCsrfToken()
  const result = await requestSession('/api/student-session', { method: 'GET' }, SESSION_EXPIRED_ERROR)
  if (!result.ok) return result
  return rememberSession(result.data)
}

export async function logoutStudentSession() {
  if (!csrfToken) return { ok: true }
  const result = await requestSession('/api/student-session', {
    method: 'DELETE', headers: { 'X-CSRF-Token': csrfToken }
  }, 'Kunde inte logga ut.')
  clearCsrfToken()
  return result.ok ? { ok: true } : result
}

export async function fetchStudentSessionProfile() {
  const result = await requestSession('/api/me/profile', { method: 'GET' }, 'Kunde inte hämta elevprofilen.')
  if (!result.ok) return result
  if (!result.data?.profile || typeof result.data.profile !== 'object') {
    return { ok: false, error: 'Elevprofilen gav ett ogiltigt svar.' }
  }
  return { ok: true, profile: result.data.profile }
}

export async function postStudentSessionEvents(entries) {
  if (!csrfToken) return { ok: false, error: SESSION_EXPIRED_ERROR }
  const result = await requestSession('/api/me/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ entries })
  }, 'Kunde inte spara svaren.')
  if (!result.ok) return result
  if (result.data?.ok !== true) return { ok: false, error: 'Svaren gav ett ogiltigt spar-svar.' }
  return { ok: true, ...result.data }
}

export async function postStudentSessionHighscore({ game, score, classId }) {
  if (!csrfToken) return { ok: false, error: SESSION_EXPIRED_ERROR }
  const result = await requestSession('/api/highscores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify({ game, score, classId })
  }, 'Kunde inte spara resultatet.')
  if (!result.ok) return result
  return { ok: true, ...result.data }
}

export function hasStudentSessionCsrfToken() {
  return Boolean(csrfToken)
}
