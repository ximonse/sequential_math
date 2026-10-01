import { getLiveStudentSession } from '../_studentSession.js'
import { withCors } from '../_helpers.js'
import { diagnosticApiEnabled, diagnosticTestStudentAllowed } from '../_diagnosticApiAccess.js'
import { listPupilDiagnosticAssignments } from '../_diagnosticAssignmentList.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,OPTIONS', headers: 'Content-Type' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!diagnosticApiEnabled()) return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
  try {
    const live = await getLiveStudentSession(req)
    if (!live) return res.status(401).json({ error: 'Inloggningen kunde inte bekräftas.' })
    if (!diagnosticTestStudentAllowed(live.profile.studentId)) {
      return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
    }
    const assignments = await listPupilDiagnosticAssignments(live.profile)
    return res.status(200).json({ assignments })
  } catch {
    return res.status(503).json({ error: 'Diagnostic assignments unavailable' })
  }
}
