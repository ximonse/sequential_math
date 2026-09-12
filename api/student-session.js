import { kv } from '@vercel/kv'
import { withCors } from './_helpers.js'
import { clearStudentLoginFailures, createStudentSession, getLiveStudentSession, hasStudentCsrf, isStudentLoginIpRateLimited, isStudentLoginRateLimited, recordStudentLoginFailure, requestIp, requestOriginIsTrusted, revokeStudentSession, setStudentSessionCookie, studentIdentityDto, verifyStudentCredentialsWithDummy } from './_studentSession.js'

const denied = res => res.status(401).json({ error: 'Inloggningen kunde inte bekräftas.' })
export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,DELETE,OPTIONS', headers: 'Content-Type' }, req); res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method === 'GET') { const live = await getLiveStudentSession(req); return live ? res.status(200).json({ ok: true, student: studentIdentityDto(live.profile), csrfToken: live.session.csrfToken }) : denied(res) }
  if (req.method === 'DELETE') { const live = await getLiveStudentSession(req); if (!live || !requestOriginIsTrusted(req) || !hasStudentCsrf(live.session, req)) return denied(res); await revokeStudentSession(req); setStudentSessionCookie(res, '', 0); return res.status(204).end() }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const studentId = String(req.body?.studentId || '').trim().toUpperCase(), qrSecret = String(req.body?.qrSecret || ''), pin = String(req.body?.pin || ''), ip = requestIp(req)
  if (!requestOriginIsTrusted(req) || !/^[A-F0-9]{32}$/.test(studentId) || qrSecret.length < 32 || !/^\d{4}$/.test(pin) || await isStudentLoginRateLimited(studentId, ip) || await isStudentLoginIpRateLimited(ip)) return denied(res)
  const profile = await kv.get(`student:${studentId}`)
  if (!verifyStudentCredentialsWithDummy(profile, qrSecret, pin)) { await recordStudentLoginFailure(studentId, ip); return denied(res) }
  await clearStudentLoginFailures(studentId, ip); const session = await createStudentSession(profile); setStudentSessionCookie(res, session.id); return res.status(201).json({ ok: true, student: studentIdentityDto(profile), csrfToken: session.csrfToken })
}
