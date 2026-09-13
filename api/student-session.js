import { kv } from '@vercel/kv'
import { withCors } from './_helpers.js'
import { clearStudentLoginFailures, createStudentSession, getLiveStudentSession, hasStudentCsrf, isStudentLoginIpRateLimited, isStudentLoginRateLimited, normalizeStudentLoginCode, recordStudentLoginFailure, requestIp, requestOriginIsTrusted, revokeStudentSession, setStudentSessionCookie, studentIdentityDto, studentLoginCodeIndexKey, verifyPilotStudentCredentials, verifyPilotStudentPin } from './_studentSession.js'

const denied = res => res.status(401).json({ error: 'Inloggningen kunde inte bekräftas.' })
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
  if (!requestOriginIsTrusted(req) || !/^\d{4}$/.test(pin) || (!hasQrCredential && !loginCode) || await isStudentLoginRateLimited(rateSubject, ip) || await isStudentLoginIpRateLimited(ip)) return denied(res)

  const studentId = hasQrCredential
    ? requestedStudentId
    : String(await kv.get(studentLoginCodeIndexKey(loginCode)) || '').trim().toUpperCase()
  const profile = isValidStudentReference(studentId) ? await kv.get(`student:${studentId}`) : null
  const credentialsValid = hasQrCredential
    ? verifyPilotStudentCredentials(profile?.auth, qrSecret, pin)
    : verifyPilotStudentPin(profile?.auth, pin)
  if (!credentialsValid) { await recordStudentLoginFailure(rateSubject, ip); return denied(res) }
  await clearStudentLoginFailures(rateSubject, ip)
  // QR sign-in gradually backfills the code index for cards issued before this migration.
  if (hasQrCredential && profile?.displayAlias) await kv.set(studentLoginCodeIndexKey(profile.displayAlias), studentId)
  const session = await createStudentSession(profile); setStudentSessionCookie(res, session.id); return res.status(201).json({ ok: true, student: studentIdentityDto(profile), csrfToken: session.csrfToken })
}
