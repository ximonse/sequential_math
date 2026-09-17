import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { kv } from '@vercel/kv'
import { isCurrentStudentProfile } from '../src/lib/studentProfileContract.js'
import { isStudentDeleted } from './_studentStore.js'

export const STUDENT_ID_BYTES = 16
export const QR_SECRET_BYTES = 32
export const STUDENT_SESSION_TTL_SECONDS = 8 * 60 * 60
export const MAX_STUDENT_LOGIN_FAILURES = 5
export const STUDENT_LOGIN_WINDOW_SECONDS = 10 * 60
export const MAX_STUDENT_LOGIN_FAILURES_PER_IP = 100
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const DUMMY_PIN_VERIFIER = createPinVerifier('0000')
const RATE_LIMIT_SCRIPT = `
local value = redis.call('INCR', KEYS[1])
if value == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return value
`

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8')
  const b = Buffer.from(String(right || ''), 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export function createStudentId() { return randomBytes(STUDENT_ID_BYTES).toString('hex').toUpperCase() }
export function createQrSecret() { return randomBytes(QR_SECRET_BYTES).toString('base64url') }
export function hashQrSecret(secret) { return createHash('sha256').update(String(secret || ''), 'utf8').digest('hex') }
export function normalizeStudentLoginCode(value) {
  return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv-SE')
}
export function studentLoginCodeIndexKey(code) {
  return `student_login_code:${hashQrSecret(normalizeStudentLoginCode(code))}`
}

export async function reserveStudentLoginCode(studentId, generateCode, { store = kv } = {}) {
  const id = String(studentId || '').trim().toUpperCase()
  if (!id || typeof generateCode !== 'function') throw new Error('Invalid student login-code reservation')
  for (let attempt = 0; attempt < 200; attempt++) {
    const code = String(generateCode()).trim()
    if (!code) throw new Error('Invalid student login code')
    const key = studentLoginCodeIndexKey(code)
    const existing = await store.get(key)
    if (existing && String(existing).toUpperCase() !== id) continue
    await store.set(key, id, { nx: true })
    if (String(await store.get(key) || '').toUpperCase() === id) return code
  }
  throw new Error('Could not reserve a unique student login code')
}

export function createPinVerifier(pin) {
  const value = String(pin || '')
  if (!/^\d{4}$/.test(value)) throw new Error('PIN must contain exactly four digits')
  const salt = randomBytes(16).toString('hex')
  return { scheme: 'scrypt-v1', salt, hash: scryptSync(value, salt, 32, SCRYPT_OPTIONS).toString('hex') }
}

export function verifyPinVerifier(pin, verifier) {
  if (!/^\d{4}$/.test(String(pin || '')) || verifier?.scheme !== 'scrypt-v1') return false
  try { return safeEqual(scryptSync(String(pin), String(verifier.salt || ''), 32, SCRYPT_OPTIONS).toString('hex'), verifier.hash) } catch { return false }
}

export function createPilotStudentAuth({ qrSecret, pin }) {
  return { scheme: 'qr-pin-v1', qrSecretHash: hashQrSecret(qrSecret), pin: createPinVerifier(pin), credentialVersion: 1, disabled: false }
}

export function verifyPilotStudentCredentials(auth, qrSecret, pin) {
  // Always run the slow PIN verifier, including for a wrong QR secret.
  const pinValid = verifyPinVerifier(pin, auth?.pin)
  return Boolean(auth?.scheme === 'qr-pin-v1' && !auth.disabled && safeEqual(hashQrSecret(qrSecret), auth.qrSecretHash) && pinValid)
}

export function verifyPilotStudentPin(auth, pin) {
  return Boolean(auth?.scheme === 'qr-pin-v1' && !auth.disabled && verifyPinVerifier(pin, auth?.pin))
}

export function readCookie(req, name) {
  const prefix = `${name}=`
  for (const value of String(req?.headers?.cookie || '').split(';')) {
    const part = value.trim()
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length))
  }
  return ''
}

export function setStudentSessionCookie(res, sessionId, maxAge = STUDENT_SESSION_TTL_SECONDS) {
  const value = sessionId ? encodeURIComponent(sessionId) : ''
  res.setHeader('Set-Cookie', `__Host-student-session=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`)
}

export function requestIp(req) { return String(req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 100) }
function isSameVercelPreviewOrigin(req, origin) {
  if (process.env.VERCEL_ENV !== 'preview') return false
  const host = String(req?.headers?.host || '').trim().toLowerCase().replace(/:\d+$/, '')
  return /^[a-z0-9-]+\.vercel\.app$/.test(host) && origin === `https://${host}`
}
export function requestOriginIsTrusted(req) {
  const origin = String(req?.headers?.origin || '')
  const configured = String(process.env.APP_ORIGIN || '').replace(/\/$/, '')
  if (configured) return origin === configured || isSameVercelPreviewOrigin(req, origin)
  if (process.env.NODE_ENV === 'development') return /^http:\/\/localhost(?::\d+)?$/.test(origin)
  return origin === 'https://matematik.ximon.se'
}
function rateKey(studentId, ip) { return `student_login_failures:${createHash('sha256').update(`${studentId}|${ip}`).digest('hex')}` }
function ipRateKey(ip) { return `student_login_ip_failures:${createHash('sha256').update(String(ip || 'unknown')).digest('hex')}` }
export async function isStudentLoginRateLimited(studentId, ip, { store = kv } = {}) { return Number(await store.get(rateKey(studentId, ip)) || 0) >= MAX_STUDENT_LOGIN_FAILURES }
export async function isStudentLoginIpRateLimited(ip, { store = kv } = {}) { return Number(await store.get(ipRateKey(ip)) || 0) >= MAX_STUDENT_LOGIN_FAILURES_PER_IP }
async function incrementRateLimit(key, store) {
  if (typeof store.eval === 'function') return Number(await store.eval(RATE_LIMIT_SCRIPT, [key], [STUDENT_LOGIN_WINDOW_SECONDS]))
  const count = Number(await store.incr(key)); if (count === 1) await store.expire(key, STUDENT_LOGIN_WINDOW_SECONDS); return count
}
export async function recordStudentLoginFailure(studentId, ip, { store = kv } = {}) {
  const count = await incrementRateLimit(rateKey(studentId, ip), store)
  await incrementRateLimit(ipRateKey(ip), store)
  return count
}
export async function clearStudentLoginFailures(studentId, ip, { store = kv } = {}) { await store.del(rateKey(studentId, ip)) }
export function verifyStudentCredentialsWithDummy(profile, qrSecret, pin) {
  const auth = profile?.auth?.scheme === 'qr-pin-v1' ? profile.auth : { scheme: 'qr-pin-v1', qrSecretHash: hashQrSecret('dummy-qr-secret'), pin: DUMMY_PIN_VERIFIER, credentialVersion: 1, disabled: false }
  return verifyPilotStudentCredentials(auth, qrSecret, pin) && profile?.auth?.scheme === 'qr-pin-v1'
}

export async function createStudentSession(profile, { store = kv } = {}) {
  const id = randomBytes(32).toString('base64url')
  const csrfToken = randomBytes(32).toString('base64url')
  await store.set(`student_session:${id}`, { studentId: profile.studentId, credentialVersion: Number(profile.auth?.credentialVersion || 1), csrfHash: hashQrSecret(csrfToken), csrfToken, createdAt: Date.now() }, { ex: STUDENT_SESSION_TTL_SECONDS })
  return { id, csrfToken }
}
export async function getLiveStudentSession(req, { store = kv } = {}) {
  const sessionId = readCookie(req, '__Host-student-session')
  if (!sessionId || sessionId.length > 200) return null
  const session = await store.get(`student_session:${sessionId}`)
  if (!session?.studentId) return null
  if (await isStudentDeleted(session.studentId, { store })) return null
  const profile = await store.get(`student:${session.studentId}`)
  if (!isCurrentStudentProfile(profile) || profile?.auth?.scheme !== 'qr-pin-v1' || profile.auth.disabled || Number(profile.auth.credentialVersion || 1) !== Number(session.credentialVersion)) return null
  if (profile.studentId !== session.studentId) return null
  for (const classId of [...new Set([profile.classId, ...(profile.classIds || [])].filter(Boolean))]) {
    if (await store.exists(`class_deleted:${classId}`)) return null
    if (!await store.get(`class:${classId}`)) return null
  }
  return { sessionId, session, profile }
}
export async function revokeStudentSession(req, { store = kv } = {}) { const id = readCookie(req, '__Host-student-session'); if (id) await store.del(`student_session:${id}`) }
export function hasStudentCsrf(session, req) { return safeEqual(hashQrSecret(req?.headers?.['x-csrf-token']), session?.csrfHash) }
export function studentIdentityDto(profile) { return { studentId: profile.studentId, name: String(profile.name || profile.displayAlias || '').trim(), displayAlias: String(profile.displayAlias || '').trim(), classIds: [...new Set([profile?.classId, ...(profile?.classIds || [])].map(String).filter(Boolean))], grade: Number(profile.grade) || null } }
