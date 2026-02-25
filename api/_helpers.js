import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const TEACHER_SESSION_TTL_MS = 12 * 60 * 60 * 1000
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEY_LEN = 64

// ── CORS ─────────────────────────────────────────────────────────────────────

export function withCors(res, options = {}) {
  const methods = String(options?.methods || 'GET,POST,OPTIONS')
  const headers = String(options?.headers || 'Content-Type')
  const origin = String(options?.origin || '*')
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', headers)
}

// ── Env helpers ───────────────────────────────────────────────────────────────

export function getConfiguredTeacherApiPassword() {
  const explicit = process.env.TEACHER_API_PASSWORD
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  return ''
}

function getConfiguredTeacherTokenSecret() {
  const explicit = process.env.TEACHER_API_PASSWORD_ROTATION_SECRET
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  return ''
}

function getTeacherTokenSigningSecret() {
  const rotationSecret = getConfiguredTeacherTokenSecret()
  if (rotationSecret) return rotationSecret
  return getConfiguredTeacherApiPassword()
}

function getTeacherTokenVerificationSecrets() {
  const list = []
  const seen = new Set()
  const push = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    list.push(normalized)
  }
  push(getTeacherTokenSigningSecret())
  push(getConfiguredTeacherApiPassword())
  return list
}

export function isProdLikeServer() {
  const env = String(process.env.VERCEL_ENV || process.env.NODE_ENV || '').toLowerCase()
  return env === 'production' || env === 'preview'
}

// ── Secure compare ────────────────────────────────────────────────────────────

export function secureCompare(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ''), 'utf8')
  const right = Buffer.from(String(rightValue || ''), 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

// ── Teacher account password hashing (scrypt, no external deps) ───────────────

export function hashTeacherPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password || ''), salt, SCRYPT_KEY_LEN, {
    N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P
  }).toString('hex')
  return { hash, salt, scheme: 'scrypt-v1' }
}

export function verifyTeacherPassword(password, storedHash, storedSalt) {
  try {
    const hash = scryptSync(String(password || ''), storedSalt, SCRYPT_KEY_LEN, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P
    }).toString('hex')
    return secureCompare(hash, storedHash)
  } catch {
    return false
  }
}

// ── Token encode/decode ───────────────────────────────────────────────────────

function encodeBase64Url(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64url')
}

function decodeBase64Url(value) {
  return Buffer.from(String(value || ''), 'base64url').toString('utf8')
}

function signPayload(payloadEncoded, secret) {
  return createHmac('sha256', secret)
    .update(String(payloadEncoded || ''))
    .digest('base64url')
}

function isTokenFormat(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || '').trim())
}

// ── Create / verify session token ─────────────────────────────────────────────

/**
 * Creates a signed session token.
 * options: { teacherId, classIds, isAdmin, ttlMs }
 * Legacy (no teacherId): treated as global admin on verification.
 */
export function createTeacherSessionToken(options = {}) {
  const signingSecret = getTeacherTokenSigningSecret()
  if (!signingSecret) return null

  const ttlMsRaw = Number(options?.ttlMs)
  const ttlMs = Number.isFinite(ttlMsRaw) ? Math.max(60 * 1000, ttlMsRaw) : TEACHER_SESSION_TTL_MS

  const now = Date.now()
  const payload = {
    iat: now,
    exp: now + ttlMs
  }

  const teacherId = String(options?.teacherId || '').trim()
  if (teacherId) {
    payload.teacherId = teacherId
    payload.classIds = Array.isArray(options?.classIds)
      ? options.classIds.map(id => String(id)).filter(Boolean)
      : []
    payload.isAdmin = Boolean(options?.isAdmin)
  }

  const payloadEncoded = encodeBase64Url(JSON.stringify(payload))
  const signature = signPayload(payloadEncoded, signingSecret)

  return {
    token: `${payloadEncoded}.${signature}`,
    expiresAt: payload.exp
  }
}

/**
 * Verifies a session token.
 * Returns the decoded payload if valid, null otherwise.
 */
export function verifyTeacherSessionToken(token) {
  const rawToken = String(token || '').trim()
  if (!isTokenFormat(rawToken)) return null

  const [payloadEncoded, signature] = rawToken.split('.')
  if (!payloadEncoded || !signature) return null

  const verificationSecrets = getTeacherTokenVerificationSecrets()
  const signatureValid = verificationSecrets.some(secret => {
    const expectedSignature = signPayload(payloadEncoded, secret)
    return secureCompare(signature, expectedSignature)
  })
  if (!signatureValid) return null

  try {
    const payload = JSON.parse(decodeBase64Url(payloadEncoded))
    const exp = Number(payload?.exp || 0)
    if (!Number.isFinite(exp) || exp <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// ── Authorization helpers ─────────────────────────────────────────────────────

/**
 * Returns teacher payload if authorized, null otherwise.
 * Legacy tokens (no teacherId) return { isAdmin: true, classIds: [], legacy: true }.
 */
export function getTeacherAuthPayload(req) {
  const configured = getConfiguredTeacherApiPassword()

  // Legacy password header (backward compat)
  const passwordHeader = String(req.headers['x-teacher-password'] || '')
  if (passwordHeader && configured && secureCompare(passwordHeader, configured)) {
    return { isAdmin: true, classIds: [], legacy: true }
  }

  const tokenHeader = String(req.headers['x-teacher-token'] || '')
  if (!tokenHeader) {
    if (!configured && !isProdLikeServer()) return { isAdmin: true, classIds: [], legacy: true }
    return null
  }

  // Try new-style signed token
  const payload = verifyTeacherSessionToken(tokenHeader)
  if (payload) {
    // Legacy token (no teacherId): treat as admin
    if (!payload.teacherId) return { isAdmin: true, classIds: [], legacy: true }
    return {
      teacherId: payload.teacherId,
      classIds: Array.isArray(payload.classIds) ? payload.classIds : [],
      isAdmin: Boolean(payload.isAdmin),
      legacy: false
    }
  }

  // Legacy fallback: token is raw password
  if (configured && secureCompare(tokenHeader, configured)) {
    return { isAdmin: true, classIds: [], legacy: true }
  }

  return null
}

/** Returns true if request has any valid teacher auth. */
export function isTeacherApiAuthorized(req) {
  return getTeacherAuthPayload(req) !== null
}

/** Returns true if request is from an admin (isAdmin flag OR legacy). */
export function isAdminAuthorized(req) {
  const payload = getTeacherAuthPayload(req)
  return payload !== null && Boolean(payload.isAdmin)
}

/**
 * Returns classIds the teacher is allowed to see.
 * Admin/legacy tokens see everything (returns null = no filter).
 */
export function getAuthorizedClassIds(req) {
  const payload = getTeacherAuthPayload(req)
  if (!payload) return [] // unauthorized
  if (payload.isAdmin) return null // null = see all
  return payload.classIds
}
