import { createHmac, timingSafeEqual } from 'node:crypto'

const TEACHER_SESSION_TTL_MS = 12 * 60 * 60 * 1000

export function withCors(res, options = {}) {
  const methods = String(options?.methods || 'GET,POST,OPTIONS')
  const headers = String(options?.headers || 'Content-Type')
  const origin = String(options?.origin || '*')
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', headers)
}

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

  // Current signing secret (preferred for new tokens).
  push(getTeacherTokenSigningSecret())
  // Legacy fallback for tokens signed before rotation secret was introduced.
  push(getConfiguredTeacherApiPassword())
  return list
}

export function isProdLikeServer() {
  const env = String(process.env.VERCEL_ENV || process.env.NODE_ENV || '').toLowerCase()
  return env === 'production' || env === 'preview'
}

export function secureCompare(leftValue, rightValue) {
  const left = Buffer.from(String(leftValue || ''), 'utf8')
  const right = Buffer.from(String(rightValue || ''), 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function encodeBase64Url(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64url')
}

function decodeBase64Url(value) {
  return Buffer.from(String(value || ''), 'base64url').toString('utf8')
}

function signTeacherSessionPayload(payloadEncoded, secret) {
  return createHmac('sha256', secret)
    .update(String(payloadEncoded || ''))
    .digest('base64url')
}

function isTeacherTokenFormat(value) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || '').trim())
}

export function createTeacherSessionToken(options = {}) {
  const configured = getConfiguredTeacherApiPassword()
  if (!configured) return null
  const signingSecret = getTeacherTokenSigningSecret()
  if (!signingSecret) return null

  const ttlMsRaw = Number(options?.ttlMs)
  const ttlMs = Number.isFinite(ttlMsRaw)
    ? Math.max(60 * 1000, ttlMsRaw)
    : TEACHER_SESSION_TTL_MS

  const now = Date.now()
  const payload = {
    iat: now,
    exp: now + ttlMs
  }
  const payloadEncoded = encodeBase64Url(JSON.stringify(payload))
  const signature = signTeacherSessionPayload(payloadEncoded, signingSecret)

  return {
    token: `${payloadEncoded}.${signature}`,
    expiresAt: payload.exp
  }
}

export function verifyTeacherSessionToken(token) {
  const configured = getConfiguredTeacherApiPassword()
  if (!configured) return false

  const rawToken = String(token || '').trim()
  if (!isTeacherTokenFormat(rawToken)) return false

  const [payloadEncoded, signature] = rawToken.split('.')
  if (!payloadEncoded || !signature) return false

  const verificationSecrets = getTeacherTokenVerificationSecrets()
  const signatureValid = verificationSecrets.some(secret => {
    const expectedSignature = signTeacherSessionPayload(payloadEncoded, secret)
    return secureCompare(signature, expectedSignature)
  })
  if (!signatureValid) return false

  try {
    const payload = JSON.parse(decodeBase64Url(payloadEncoded))
    const exp = Number(payload?.exp || 0)
    return Number.isFinite(exp) && exp > Date.now()
  } catch {
    return false
  }
}

export function isTeacherApiAuthorized(req) {
  const configured = getConfiguredTeacherApiPassword()
  if (!configured) return !isProdLikeServer()

  const tokenHeader = String(req.headers['x-teacher-token'] || '')
  if (verifyTeacherSessionToken(tokenHeader)) return true

  const passwordHeader = String(req.headers['x-teacher-password'] || '')
  if (passwordHeader && secureCompare(passwordHeader, configured)) return true

  // Migration fallback: older clients may send password in x-teacher-token.
  if (tokenHeader && secureCompare(tokenHeader, configured)) return true

  return false
}
