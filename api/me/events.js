import { getLiveStudentSession, hasStudentCsrf, requestOriginIsTrusted } from '../_studentSession.js'
import { withCors } from '../_helpers.js'
import { persistStudentEvents } from '../student/[studentId]/events.js'
import { studentStoreError } from '../_studentStore.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type, x-csrf-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const live = await getLiveStudentSession(req)
    if (!live || !requestOriginIsTrusted(req) || !hasStudentCsrf(live.session, req)) {
      return res.status(401).json({ error: 'Inloggningen kunde inte bekräftas.' })
    }
    const result = await persistStudentEvents(live.profile.studentId, req.body?.entries, async current => {
      if (current.studentId !== live.profile.studentId || current.auth?.scheme !== 'qr-pin-v1' || current.auth.disabled
        || Number(current.auth.credentialVersion || 1) !== Number(live.session.credentialVersion)) {
        throw studentStoreError(401, 'Student session is no longer valid')
      }
    })
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte spara svaren.' })
  }
}
