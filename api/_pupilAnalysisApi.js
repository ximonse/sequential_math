import { getLiveTeacherAuthPayload } from './_helpers.js'
import { assertPupilEvidenceAccess, assertEvidenceSourceAccess, readPupilEvidence } from './_pupilEvidenceRead.js'
import { buildPupilAnalysisDraft, validateAnalysisCheckIn, validatePupilAnalysis } from '../src/lib/pupilAnalysis.js'
import { appendPupilAnalysis, readPupilAnalysisState } from './_pupilAnalysisStore.js'
import { evidenceError } from './_pupilEvidence.js'

function visibleState(state, auth, studentId) {
  const reports = state.reports.filter(item => {
    try { assertEvidenceSourceAccess(auth, studentId, item.report.source); return true } catch { return false }
  })
  return { ...state, reports, restrictedReports: state.reports.length - reports.length }
}

export async function pupilAnalysisAction(req, auth, studentId) {
  const classId = req.query?.classId
  if (typeof classId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(classId)) throw evidenceError(400, 'invalid_class', 'Ange ett klass-ID.')
  await assertPupilEvidenceAccess(req, studentId, classId)
  const state = await readPupilAnalysisState(studentId, classId, auth.teacherId)
  if (req.method === 'GET') {
    const liveAuth = await getLiveTeacherAuthPayload(req)
    if (!liveAuth || liveAuth.teacherId !== auth.teacherId) throw evidenceError(403, 'analysis_access_denied', 'Lärarsessionen har ändrats.')
    await assertPupilEvidenceAccess(req, studentId, classId)
    return visibleState(state, liveAuth, studentId)
  }
  const body = req.body || {}
  let content
  if (body.action === 'draft' || body.action === 'create_report') {
    const query = { classId, source: body.source || 'practice', from: body.from, to: body.to,
      ...(body.action === 'create_report' ? { snapshotRevision: body.report?.snapshotRevision } : {}) }
    // IncomingMessage exposes headers through a prototype getter, not an enumerable field.
    const evidence = await readPupilEvidence({ ...req, headers: req.headers, method: req.method, query }, auth, studentId, { unpaged: true })
    if (body.action === 'draft') {
      const proposal = buildPupilAnalysisDraft(evidence)
      return { draft: proposal, preview: validatePupilAnalysis(proposal, evidence), revision: state.revision }
    }
    content = validatePupilAnalysis(body.report, evidence)
  } else if (body.action === 'check_in') {
    const target = state.reports.find(item => item.id === body.reportId)
    if (!target) throw evidenceError(404, 'analysis_not_found', 'Rapportversionen finns inte.')
    assertEvidenceSourceAccess(auth, studentId, target.report.source)
    content = validateAnalysisCheckIn(body.checkIn, target.report)
  } else throw evidenceError(400, 'invalid_analysis_command', 'Okänd rapportåtgärd.')
  const liveAuth = await getLiveTeacherAuthPayload(req)
  if (!liveAuth || liveAuth.teacherId !== auth.teacherId) throw evidenceError(403, 'analysis_access_denied', 'Lärarsessionen har ändrats.')
  await assertPupilEvidenceAccess(req, studentId, classId)
  assertEvidenceSourceAccess(liveAuth, studentId, body.action === 'check_in'
    ? state.reports.find(item => item.id === body.reportId).report.source : content.source)
  const saved = await appendPupilAnalysis(state, body, content)
  return { ...visibleState(saved, liveAuth, studentId), affectedReportId: body.action === 'check_in'
    ? body.reportId : saved.reports.find(item => item.requestId === body.requestId).id }
}
