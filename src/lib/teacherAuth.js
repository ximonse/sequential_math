const TEACHER_AUTH_KEY = 'mathapp_teacher_auth'
const TEACHER_API_TOKEN_KEY = 'mathapp_teacher_api_token'
const TEACHER_IDENTITY_KEY = 'mathapp_teacher_identity'

// ── Login ─────────────────────────────────────────────────────────────────────

/**
 * Account login. Body: { username, password }.
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
    isAdmin: Boolean(data?.isAdmin),
    isPrimaryAdmin: Boolean(data?.isPrimaryAdmin)
  }
  sessionStorage.setItem(TEACHER_AUTH_KEY, '1')
  sessionStorage.setItem(TEACHER_API_TOKEN_KEY, token)
  sessionStorage.setItem(TEACHER_IDENTITY_KEY, JSON.stringify(identity))
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
    if (!raw) return { teacherId: null, displayName: '', classIds: [], isAdmin: false, isPrimaryAdmin: false }
    return JSON.parse(raw)
  } catch {
    return { teacherId: null, displayName: '', classIds: [], isAdmin: false, isPrimaryAdmin: false }
  }
}

export function isTeacherAdmin() {
  return getTeacherIdentity().isAdmin
}

export function getTeacherAccountKind(identity = getTeacherIdentity()) {
  if (identity?.isPrimaryAdmin || (identity?.isAdmin && String(identity?.teacherId || '').toLowerCase() === 'admin')) {
    return 'primary-admin'
  }
  return identity?.isAdmin ? 'admin' : 'teacher'
}

export function getTeacherAccountLabel(identity = getTeacherIdentity()) {
  const kind = getTeacherAccountKind(identity)
  if (kind === 'primary-admin') return 'Huvudadmin'
  if (kind === 'admin') return 'Administratör'
  return 'Lärare'
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
