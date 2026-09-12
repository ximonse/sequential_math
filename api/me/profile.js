import { getLiveStudentSession } from '../_studentSession.js'
import { withCors } from '../_helpers.js'
import { withFreshTeacherSummary } from '../../src/lib/teacherSummary.js'
import { sanitizeStudentProfileForResponse } from '../student/[studentId].js'

function sanitizePilotTicketData(profile) {
  const safe = sanitizeStudentProfileForResponse(profile)
  if (!safe || typeof safe !== 'object') return safe
  if (safe.ticketInbox?.activePayload && typeof safe.ticketInbox.activePayload === 'object') {
    const { answer, ...dispatch } = safe.ticketInbox.activePayload
    safe.ticketInbox = { ...safe.ticketInbox, activePayload: dispatch, activeEncoded: '' }
  }
  if (Array.isArray(safe.ticketResponses)) {
    safe.ticketResponses = safe.ticketResponses.map(response => {
      const { expectedAnswer, normalizedExpectedAnswer, normalizedStudentAnswer, ...visible } = response
      if (!visible.showCorrectnessOnSubmit && !visible.teacherRevealAt) delete visible.isCorrect
      return visible
    })
  }
  return safe
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,OPTIONS', headers: 'Content-Type' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const live = await getLiveStudentSession(req)
    if (!live) return res.status(401).json({ error: 'Inloggningen kunde inte bekräftas.' })
    return res.status(200).json({ profile: sanitizePilotTicketData(withFreshTeacherSummary(live.profile)) })
  } catch {
    return res.status(503).json({ error: 'Kunde inte hämta elevprofilen.' })
  }
}
