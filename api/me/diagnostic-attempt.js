import { getLiveStudentSession, hasStudentCsrf, requestOriginIsTrusted } from '../_studentSession.js'
import { withCors } from '../_helpers.js'
import { openDiagnosticAttempt } from '../_diagnosticAssignmentStore.js'
import { appendDiagnosticAttempt, readDiagnosticAttempt } from '../_diagnosticAttemptStore.js'
import { assertDiagnosticPupilAccess, diagnosticApiEnabled, diagnosticTestStudentAllowed } from '../_diagnosticApiAccess.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type,x-csrf-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!diagnosticApiEnabled()) return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
  try {
    const live = await getLiveStudentSession(req)
    if (!live || (req.method === 'POST' && (!requestOriginIsTrusted(req) || !hasStudentCsrf(live.session, req)))) {
      return res.status(401).json({ error: 'Inloggningen kunde inte bekräftas.' })
    }
    if (!diagnosticTestStudentAllowed(live.profile.studentId)) {
      return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
    }
    if (req.method === 'POST' && req.body?.action === 'open') {
      const opened = await openDiagnosticAttempt({ assignmentId: req.body?.assignmentId,
        assignmentItemId: req.body?.assignmentItemId, studentId: live.profile.studentId })
      await assertDiagnosticPupilAccess(live.profile, opened.record)
      return res.status(200).json({ kind: opened.kind, record: opened.record,
        snapshot: opened.snapshot, saveStatus: 'server_confirmed' })
    }
    const attemptId = req.method === 'GET' ? req.query?.attemptId : req.body?.attemptId
    if (typeof attemptId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(attemptId)) {
      return res.status(400).json({ error: 'Invalid diagnostic attempt ID' })
    }
    const saved = await readDiagnosticAttempt(attemptId)
    if (!saved) return res.status(404).json({ error: 'Diagnostic attempt not found' })
    await assertDiagnosticPupilAccess(live.profile, saved.record)
    if (req.method === 'GET') return res.status(200).json({ ...saved, saveStatus: 'server_confirmed' })
    if (req.body?.action !== 'append') return res.status(400).json({ error: 'Unknown diagnostic action' })
    const result = await appendDiagnosticAttempt({ attemptId, studentId: live.profile.studentId,
      expectedRevision: req.body?.expectedRevision, events: req.body?.events })
    return res.status(200).json({ ...result, saveStatus: 'server_confirmed' })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Diagnostic storage unavailable', code: error.code })
  }
}
