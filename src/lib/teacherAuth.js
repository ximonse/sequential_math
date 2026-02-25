const TEACHER_AUTH_KEY = 'mathapp_teacher_auth'
const TEACHER_API_TOKEN_KEY = 'mathapp_teacher_api_token'
const TEACHER_IDENTITY_KEY = 'mathapp_teacher_identity'

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * New per-teacher login. Body: { username, password }
 * Falls back to legacy /api/teacher-auth if new endpoint not available.
 */
export async function loginTeacher(username, password) {
  const usernameStr = String(username || '').trim()
  const passwordStr = String(password || '')

  if (!usernameStr || !passwordStr) {
    return { ok: false, code: 'MISSING_CREDENTIALS' }
  }

  try {
    const response = await fetch('/api/teacher-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameStr, password: passwordStr })
    })

    if (!response.ok) {
      let code = 'AUTH_FAILED'
      try {
        const data = await response.json()
        code = data?.code || code
      } catch { /* no-op */ }
      return { ok: false, code }
    }

    const data = await response.json()
    storeTeacherSession(data)
    return { ok: true }
  } catch {
    return { ok: false, code: 'NETWORK_ERROR' }
  }
}

function storeTeacherSession(data) {
  const token = String(data?.token || '')
  const identity = {
    teacherId: data?.teacherId || null,
    displayName: String(data?.displayName || 'Lärare'),
    classIds: Array.isArray(data?.classIds) ? data.classIds : [],
    isAdmin: Boolean(data?.isAdmin)
  }
  sessionStorage.setItem(TEACHER_AUTH_KEY, '1')
  sessionStorage.setItem(TEACHER_API_TOKEN_KEY, token)
  sessionStorage.setItem(TEACHER_IDENTITY_KEY, JSON.stringify(identity))
}

// ── Legacy helpers (keep for compat with old teacher-auth route) ──────────────

export async function getTeacherAuthStatus() {
  try {
    const response = await fetch('/api/teacher-auth')
    if (!response.ok) return { configured: false, source: 'server_error' }
    const data = await response.json()
    return { configured: Boolean(data?.configured), source: 'server' }
  } catch {
    return { configured: false, source: 'network_error' }
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export function logoutTeacher() {
  sessionStorage.removeItem(TEACHER_AUTH_KEY)
  sessionStorage.removeItem(TEACHER_API_TOKEN_KEY)
  sessionStorage.removeItem(TEACHER_IDENTITY_KEY)
}

// ── State reads ───────────────────────────────────────────────────────────────

export function isTeacherAuthenticated() {
  return sessionStorage.getItem(TEACHER_AUTH_KEY) === '1'
}

export function getTeacherApiToken() {
  return sessionStorage.getItem(TEACHER_API_TOKEN_KEY) || ''
}

export function getTeacherIdentity() {
  try {
    const raw = sessionStorage.getItem(TEACHER_IDENTITY_KEY)
    if (!raw) return { teacherId: null, displayName: '', classIds: [], isAdmin: false }
    return JSON.parse(raw)
  } catch {
    return { teacherId: null, displayName: '', classIds: [], isAdmin: false }
  }
}

export function isTeacherAdmin() {
  return getTeacherIdentity().isAdmin
}

/**
 * Returns the classIds this teacher is allowed to see.
 * Admin returns null (= see everything).
 */
export function getTeacherClassIds() {
  const identity = getTeacherIdentity()
  if (identity.isAdmin) return null
  return Array.isArray(identity.classIds) ? identity.classIds : []
}
