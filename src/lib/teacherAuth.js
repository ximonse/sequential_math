const TEACHER_AUTH_KEY = 'mathapp_teacher_auth'
const TEACHER_API_TOKEN_KEY = 'mathapp_teacher_api_token'

export async function getTeacherAuthStatus() {
  try {
    const response = await fetch('/api/teacher-auth')
    if (!response.ok) {
      return { configured: false, source: 'server_error' }
    }
    const data = await response.json()
    return {
      configured: Boolean(data?.configured),
      source: 'server'
    }
  } catch {
    return { configured: false, source: 'network_error' }
  }
}

export async function loginTeacher(password) {
  const normalized = String(password || '')
  if (normalized.trim() === '') {
    return { ok: false, code: 'MISSING_PASSWORD' }
  }

  try {
    const response = await fetch('/api/teacher-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: normalized })
    })

    if (!response.ok) {
      let code = 'AUTH_FAILED'
      try {
        const data = await response.json()
        code = data?.code || code
      } catch {
        // no-op
      }
      return { ok: false, code }
    }

    sessionStorage.setItem(TEACHER_AUTH_KEY, '1')
    sessionStorage.setItem(TEACHER_API_TOKEN_KEY, normalized)
    return { ok: true }
  } catch {
    return { ok: false, code: 'NETWORK_ERROR' }
  }
}

export function logoutTeacher() {
  sessionStorage.removeItem(TEACHER_AUTH_KEY)
  sessionStorage.removeItem(TEACHER_API_TOKEN_KEY)
}

export function isTeacherAuthenticated() {
  return sessionStorage.getItem(TEACHER_AUTH_KEY) === '1'
}

export function getTeacherApiToken() {
  return sessionStorage.getItem(TEACHER_API_TOKEN_KEY) || ''
}

// Backward-compatible helpers for existing UI wiring.
export function getTeacherPasswordSource() {
  return 'server'
}

export function clearCustomTeacherPassword() {
  // legacy no-op
}

export function setCustomTeacherPassword() {
  return false
}

export function verifyTeacherPassword() {
  return false
}

export function isTeacherPasswordConfigured() {
  return true
}

