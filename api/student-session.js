import { kv } from '@vercel/kv'
import { withCors } from './_helpers.js'
import { clearStudentLoginFailures, createStudentSession, getLiveStudentSession, hasStudentCsrf, isStudentLoginIpRateLimited, isStudentLoginRateLimited, normalizeStudentLoginCode, recordStudentLoginFailure, requestIp, requestOriginIsTrusted, revokeStudentSession, setStudentSessionCookie, studentIdentityDto, studentLoginCodeIndexKey, verifyPilotStudentCredentials, verifyPilotStudentPin } from './_studentSession.js'
import { guardPupilKey } from './_pupilReferenceWrite.js'

const denied = res => res.status(401).json({ error: 'Inloggningen kunde inte bekräftas.' })
function denyLogin(res, reason) {
  // Keep the client response generic and log no credentials or pupil identifiers.
  if (process.env.VERCEL_ENV === 'preview') console.info('preview_student_login_denied', { reason })
  return denied(res)
}

const isValidStudentReference = value => /^[A-Z0-9ÅÄÖ_]{3,100}$/u.test(String(value || ''))
export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,DELETE,OPTIONS', headers: 'Content-Type' }, req); res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method === 'GET') { const live = await getLiveStudentSession(req); return live ? res.status(200).json({ ok: true, student: studentIdentityDto(live.profile), csrfToken: live.session.csrfToken }) : denied(res) }
  if (req.method === 'DELETE') { const live = await getLiveStudentSession(req); if (!live || !requestOriginIsTrusted(req) || !hasStudentCsrf(live.session, req)) return denied(res); await revokeStudentSession(req); setStudentSessionCookie(res, '', 0); return res.status(204).end() }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const requestedStudentId = String(req.body?.studentId || '').trim().toUpperCase()
  const qrSecret = String(req.body?.qrSecret || '')
  const loginCode = normalizeStudentLoginCode(req.body?.loginCode)
  const pin = String(req.body?.pin || '')
  const ip = requestIp(req)
  const hasQrCredential = isValidStudentReference(requestedStudentId) && qrSecret.length >= 32
  const rateSubject = hasQrCredential ? requestedStudentId : `code:${studentLoginCodeIndexKey(loginCode)}`
  if (!requestOriginIsTrusted(req)) return denyLogin(res, 'origin')
  if (!/^\d{4}$/.test(pin) || (!hasQrCredential && !loginCode)) return denyLogin(res, 'input')
  if (await isStudentLoginRateLimited(rateSubject, ip) || await isStudentLoginIpRateLimited(ip)) return denyLogin(res, 'rate_limit')

  const studentId = hasQrCredential
    ? requestedStudentId
    : String(await kv.get(studentLoginCodeIndexKey(loginCode)) || '').trim().toUpperCase()
  const profile = isValidStudentReference(studentId) ? await kv.get(`student:${studentId}`) : null
  const credentialsValid = hasQrCredential
    ? verifyPilotStudentCredentials(profile?.auth, qrSecret, pin)
    : verifyPilotStudentPin(profile?.auth, pin)
  if (!credentialsValid) { await recordStudentLoginFailure(rateSubject, ip); return denyLogin(res, 'credential') }
  await clearStudentLoginFailures(rateSubject, ip)
  // QR sign-in gradually backfills the code index for cards issued before this migration.
  if (hasQrCredential && profile?.displayAlias) await guardPupilKey(studentLoginCodeIndexKey(profile.displayAlias), studentId, studentId, { live: true })
  const session = await createStudentSession(profile)
  if (!session) return denyLogin(res, 'session_creation')
  setStudentSessionCookie(res, session.id); return res.status(201).json({ ok: true, student: studentIdentityDto(profile), csrfToken: session.csrfToken })
}
