import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { kv } from '@vercel/kv'

const TEACHER_SESSION_TTL_MS = 12 * 60 * 60 * 1000
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEY_LEN = 64

// ── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  'https://matematik.ximon.se'
]

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (/^https:\/\/[\w-]+-ximonses-projects\.vercel\.app$/.test(origin)) return true
  if (!isProdLikeServer() && /^http:\/\/localhost(:\d+)?$/.test(origin)) return true
  return false
}

export function withCors(res, options = {}, req = null) {
  const methods = String(options?.methods || 'GET,POST,OPTIONS')
  const headers = String(options?.headers || 'Content-Type')
  const requestOrigin = String(req?.headers?.origin || options?.requestOrigin || '')
  const origin = isAllowedOrigin(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', headers)
  res.setHeader('Vary', 'Origin')
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
  return env !== 'development'
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
 * Tokens without a teacher ID are rejected during authorization.
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
    payload.sessionVersion = Math.max(1, Number(options?.sessionVersion) || 1)
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
 * Only account-bound signed tokens are accepted.
 */
export function getTeacherAuthPayload(req) {
  const tokenHeader = String(req.headers['x-teacher-token'] || '')
  if (!tokenHeader) return null

  const payload = verifyTeacherSessionToken(tokenHeader)
  if (!payload?.teacherId) return null
  return {
    teacherId: payload.teacherId,
    classIds: Array.isArray(payload.classIds) ? payload.classIds : [],
    isAdmin: Boolean(payload.isAdmin),
    sessionVersion: Math.max(1, Number(payload.sessionVersion) || 1),
    legacy: false
  }
}

/**
 * Signed account tokens are only valid while their account and session version
 * still exist in KV.
 */
export async function getLiveTeacherAuthPayload(req, { store = kv } = {}) {
  const tokenAuth = getTeacherAuthPayload(req)
  if (!tokenAuth) return null

  const account = await store.get(`teacher_account:${tokenAuth.teacherId}`)
  if (!account || account.disabled === true) return null
  const accountVersion = Math.max(1, Number(account.sessionVersion) || 1)
  if (accountVersion !== tokenAuth.sessionVersion) return null

  return {
    teacherId: tokenAuth.teacherId,
    classIds: Array.isArray(account.classIds) ? account.classIds.map(String).filter(Boolean) : [],
    isAdmin: Boolean(account.isAdmin),
    sessionVersion: accountVersion,
    legacy: false
  }
}

export async function isLiveTeacherApiAuthorized(req, options) {
  return (await getLiveTeacherAuthPayload(req, options)) !== null
}

export async function isLiveAdminAuthorized(req, options) {
  const auth = await getLiveTeacherAuthPayload(req, options)
  return auth !== null && Boolean(auth.isAdmin)
}

/** Returns true if request has any valid teacher auth. */
export function isTeacherApiAuthorized(req) {
  return getTeacherAuthPayload(req) !== null
}

/** Returns true if request is from an admin account. */
export function isAdminAuthorized(req) {
  const payload = getTeacherAuthPayload(req)
  return payload !== null && Boolean(payload.isAdmin)
}

/**
 * Returns classIds the teacher is allowed to see.
 * Admin tokens see everything (returns null = no filter).
 */
export function getAuthorizedClassIds(req) {
  const payload = getTeacherAuthPayload(req)
  if (!payload) return [] // unauthorized
  if (payload.isAdmin) return null // null = see all
  return payload.classIds
}
