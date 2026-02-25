export const PASSWORD_SCHEME = 'sha256-v1'

function hasHashedPassword(auth) {
  return Boolean(
    auth
    && auth.passwordScheme === PASSWORD_SCHEME
    && typeof auth.passwordHash === 'string'
    && auth.passwordHash.trim() !== ''
    && typeof auth.passwordSalt === 'string'
    && auth.passwordSalt.trim() !== ''
  )
}

export function ensureProfileAuth(profile) {
  if (!profile.auth || typeof profile.auth !== 'object') {
    profile.auth = {
      password: profile.name || profile.studentId,
      passwordUpdatedAt: profile.created_at || Date.now(),
      lastLoginAt: null,
      loginCount: 0
    }
  }

  if (!hasHashedPassword(profile.auth) && (!profile.auth.password || String(profile.auth.password).trim() === '')) {
    profile.auth.password = profile.name || profile.studentId
  }

  if (typeof profile.auth.loginCount !== 'number') {
    profile.auth.loginCount = 0
  }

  if (!('lastLoginAt' in profile.auth)) {
    profile.auth.lastLoginAt = null
  }

  if (hasHashedPassword(profile.auth) && profile.auth.passwordScheme !== PASSWORD_SCHEME) {
    profile.auth.passwordScheme = PASSWORD_SCHEME
  }

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

  if (hasHashedPassword(profile.auth)) {
    const actualHash = await hashPasswordWithSalt(plainPassword, profile.auth.passwordSalt)
    return actualHash === profile.auth.passwordHash
  }

  const legacyPassword = String(profile.auth.password || '')
  if (!legacyPassword) return false
  if (plainPassword !== legacyPassword) return false

  // Migrera äldre klartextprofiler vid första lyckade inloggning.
  await setProfilePassword(profile, plainPassword, { keepUpdatedAt: true })
  return true
}
