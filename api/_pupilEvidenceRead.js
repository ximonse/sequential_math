import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { studentDeletedKey } from './_studentStore.js'
import { diagnosticApiEnabled, diagnosticTestStudentAllowed } from './_diagnosticApiAccess.js'
import { isSchoolAdminRole } from './_teacherRoles.js'
import { evidencePeriod } from '../src/lib/evidencePeriod.js'
import { evidenceError, evidencePage, practiceEvidence } from './_pupilEvidence.js'
import { pupilScreeningEvidence } from './_pupilScreeningEvidence.js'
import { diagnosticNotebookExport } from '../src/domains/arithmetic/diagnosticNotebookExport.js'

export async function assertPupilEvidenceAccess(req, studentId, classId) {
  const profile = await kv.get(`student:${studentId}`)
  const classroom = await kv.get(`class:${classId}`)
  if (!profile || profile.studentId !== studentId || !classroom || classroom.archived
    || await kv.exists(studentDeletedKey(studentId)) || await kv.exists(`student_deleted:${studentId}`)
    || ![profile.classId, ...(profile.classIds || [])].includes(classId)
    || !await canAccessClass(req, classId)) {
    throw evidenceError(403, 'evidence_access_denied', 'Ingen aktuell åtkomst till eleven i denna klass.')
  }
  return profile
}

export function assertEvidenceSourceAccess(auth, studentId, source) {
  if (!['practice', 'screening', 'all'].includes(source)) throw evidenceError(400, 'invalid_source', 'Ogiltig källa.')
  if (source !== 'practice' && (!diagnosticApiEnabled() || !isSchoolAdminRole(auth.role, auth.isAdmin)
    || !diagnosticTestStudentAllowed(studentId))) {
    throw evidenceError(403, 'screening_access_denied', 'Screening kräver aktiverad åtkomst och aktuell administratörsbehörighet.')
  }
}

export async function readPupilEvidence(req, auth, studentId, { unpaged = false } = {}) {
  const query = req.query || {}
  const classId = query.classId
  if (typeof classId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(classId)) {
    throw evidenceError(400, 'invalid_class', 'Ange ett klass-ID.')
  }
  const source = query.source ?? 'practice'
  if (!['practice', 'screening', 'all'].includes(source)) throw evidenceError(400, 'invalid_source', 'Ogiltig källa.')
  let period
  try { period = evidencePeriod(query.from, query.to) } catch (error) { throw evidenceError(400, 'invalid_period', error.message) }
  const profile = await assertPupilEvidenceAccess(req, studentId, classId)
  assertEvidenceSourceAccess(auth, studentId, source)
  const practice = source === 'screening' ? { entries: [], coverage: { status: 'not_requested' } } : practiceEvidence(profile)
  const screening = source === 'practice' ? { entries: [], coverage: { status: 'not_requested' } }
    : await pupilScreeningEvidence(studentId, classId)
  // Recheck membership and live teacher/class access after potentially slow detail reads.
  await assertPupilEvidenceAccess(req, studentId, classId)
  if (source !== 'practice') {
    const liveAuth = await getLiveTeacherAuthPayload(req)
    if (!liveAuth || !isSchoolAdminRole(liveAuth.role, liveAuth.isAdmin)
      || !diagnosticApiEnabled() || !diagnosticTestStudentAllowed(studentId)) {
      throw evidenceError(403, 'screening_access_denied', 'Screeningåtkomsten ändrades under läsningen.')
    }
  }
  const result = evidencePage({ studentId, classId, source, period, practice, screening, query, unpaged })
  if (query.format !== undefined) {
    if (query.format !== 'notebook' || !query.ref || !query.snapshotRevision) {
      throw evidenceError(400, 'invalid_format', 'Notebook-export kräver format=notebook, ref och snapshotRevision.')
    }
    if (!result.entry?.detail?.snapshot) throw evidenceError(404, 'notebook_unavailable', 'Denna observation har inget sparat räknehäfte.')
    return { schemaVersion: 1, studentId, classId, snapshotRevision: result.snapshotRevision, ref: query.ref,
      reference: result.entry.reference, notebook: diagnosticNotebookExport(result.entry.detail.snapshot, result.entry.question) }
  }
  return result
}
