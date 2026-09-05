import {
  STUDENT_PASSWORD_SCHEME,
  hasCurrentStudentPassword
} from './studentProfileContract'

export const PASSWORD_SCHEME = STUDENT_PASSWORD_SCHEME

export function ensureProfileAuth(profile) {
  if (!profile.auth || typeof profile.auth !== 'object') profile.auth = {}

  if (typeof profile.auth.loginCount !== 'number') {
    profile.auth.loginCount = 0
  }

  if (!('lastLoginAt' in profile.auth)) {
    profile.auth.lastLoginAt = null
  }

  delete profile.auth.password
  return profile
}

function createPasswordSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPasswordWithSalt(password, salt) {
  const encoded = new TextEncoder().encode(`${salt}:${String(password || '')}`)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function setProfilePassword(profile, plainPassword, options = {}) {
  ensureProfileAuth(profile)
  const salt = createPasswordSalt()
  const hash = await hashPasswordWithSalt(plainPassword, salt)
  const keepUpdatedAt = options.keepUpdatedAt === true
  const previousUpdatedAt = profile.auth.passwordUpdatedAt

  profile.auth.passwordScheme = PASSWORD_SCHEME
  profile.auth.passwordSalt = salt
  profile.auth.passwordHash = hash
  profile.auth.passwordUpdatedAt = keepUpdatedAt && previousUpdatedAt ? previousUpdatedAt : Date.now()
  delete profile.auth.password
}

export async function verifyPasswordForProfile(profile, plainPassword) {
  ensureProfileAuth(profile)

  if (hasCurrentStudentPassword(profile.auth)) {
    const actualHash = await hashPasswordWithSalt(plainPassword, profile.auth.passwordSalt)
    if (actualHash === profile.auth.passwordHash) return true

    // Fallback: try uppercase (reset sets password = uppercase studentId)
    const upper = plainPassword.toUpperCase()
    if (upper !== plainPassword) {
      const upperHash = await hashPasswordWithSalt(upper, profile.auth.passwordSalt)
      if (upperHash === profile.auth.passwordHash) return true
    }
    return false
  }

  return false
}
