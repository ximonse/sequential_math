import { kv } from '@vercel/kv'
import { measureRequestStep } from './_requestTiming.js'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { studentDeletedKey } from './_studentStore.js'
import { diagnosticApiEnabled, diagnosticTestStudentAllowed } from './_diagnosticApiAccess.js'
import { evidencePeriod } from '../src/lib/evidencePeriod.js'
import { evidenceError, evidencePage, practiceEvidence } from './_pupilEvidence.js'
import { pupilScreeningEvidence } from './_pupilScreeningEvidence.js'
import { applySlipExclusions, readSlipExclusions } from './_slipExclusions.js'
import { diagnosticNotebookExport } from '../src/domains/arithmetic/diagnosticNotebookExport.js'

export async function assertPupilEvidenceAccess(req, studentId, classId) {
  const [profile, classroom, deleted, legacyDeleted] = await Promise.all([
    kv.get(`student:${studentId}`), kv.get(`class:${classId}`),
    kv.exists(studentDeletedKey(studentId)), kv.exists(`student_deleted:${studentId}`)
  ])
  if (!profile || profile.studentId !== studentId || !classroom || classroom.archived
    || deleted || legacyDeleted
    || ![profile.classId, ...(profile.classIds || [])].includes(classId)
    || !await canAccessClass(req, classId)) {
    throw evidenceError(403, 'evidence_access_denied', 'Ingen aktuell åtkomst till eleven i denna klass.')
  }
  return profile
}

// Simon 2026-11-09: every teacher with access to the pupil's class may read
// screening answers in the analysis. Focus activities are a separate record and
// never part of this evidence.
// Simon 2026-11-11: creating and dispatching screenings is a teacher's own work,
// so class access decides it too. Changing or removing someone else's screening
// still belongs to its author, which the assignment routes check separately.
export function assertEvidenceSourceAccess(auth, studentId, source, { write = false } = {}) {
  if (!['practice', 'screening', 'all'].includes(source)) throw evidenceError(400, 'invalid_source', 'Ogiltig källa.')
  if (source !== 'practice' && (!diagnosticApiEnabled() || !diagnosticTestStudentAllowed(studentId))) {
    throw evidenceError(403, 'screening_access_denied', write
      ? 'Att skapa och dela ut screening kräver aktiverad screeningåtkomst för eleven.'
      : 'Screeningsvar är inte tillgängliga för den här eleven.')
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
    : await measureRequestStep(req, 'screening-history', () => pupilScreeningEvidence(studentId, classId))
  // Recheck membership and live teacher/class access after potentially slow detail reads.
  await assertPupilEvidenceAccess(req, studentId, classId)
  if (source !== 'practice') {
    const liveAuth = await getLiveTeacherAuthPayload(req)
    if (!liveAuth || !diagnosticApiEnabled() || !diagnosticTestStudentAllowed(studentId)) {
      throw evidenceError(403, 'screening_access_denied', 'Screeningåtkomsten ändrades under läsningen.')
    }
  }
  // Answers the teacher hid as slips do not count; they are listed separately so they can be restored.
  const exclusions = await readSlipExclusions(studentId)
  const practiceSplit = applySlipExclusions(practice.entries, exclusions), screeningSplit = applySlipExclusions(screening.entries, exclusions)
  const result = evidencePage({ studentId, classId, source, period, query, unpaged,
    practice: { ...practice, entries: practiceSplit.kept }, screening: { ...screening, entries: screeningSplit.kept } })
  if (!query.ref) result.hiddenSlips = [...practiceSplit.hidden, ...screeningSplit.hidden]
    .filter(entry => entry.timestamp >= period.startInclusive && entry.timestamp < period.endExclusive)
    .map(entry => ({ exclusionKey: entry.exclusionKey, excludedAt: entry.excludedAt, source: entry.source, timestamp: entry.timestamp,
      question: entry.question, answer: { studentAnswer: entry.answer.studentAnswer, correctAnswer: entry.answer.correctAnswer } }))
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
