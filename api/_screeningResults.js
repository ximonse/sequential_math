import { kv } from '@vercel/kv'
import { diagnosticClassOverview } from './_diagnosticClassOverview.js'
import { hasEvidenceTime, screeningEvidenceEntry } from './_pupilScreeningEvidence.js'
import { withTeacherAssessment } from '../src/lib/evidenceTeacherAssessment.js'
import { screeningPupilAnswers } from '../src/lib/screeningMisconceptions.js'
import { logUnexpectedDiagnosticError } from './_diagnosticErrorLog.js'

// The results table and the misconception cards for one screening in one class,
// from one read. The cards used to be a second request that started only after
// the table had arrived and read the same attempts, originals and reviews again.
// The answers are built exactly as in screeningMisconceptionPupils: the latest
// attempt per task, and only attempts the pupil's own index also lists.
export async function screeningResults(assignment, studentIds, { store = kv, req } = {}) {
  const roster = studentIds.filter(id => assignment.studentIds.includes(id))
  const latest = new Map(roster.map(id => [id, new Map()]))
  const [overview, indexes] = await Promise.all([
    diagnosticClassOverview(assignment, studentIds, { store,
      onLatest: value => latest.get(value.studentId)?.set(value.saved.record.attemptId, value) }),
    // A failed card read must not take the table with it.
    Promise.all(roster.map(id => store.smembers(`diagnostic_attempts_by_student:${id}`)))
      .catch(error => ({ error }))
  ])
  return { ...overview, misconceptions: misconceptionPart(assignment, roster, latest, indexes, req) }
}

function misconceptionPart(assignment, roster, latest, indexes, req) {
  try {
    if (indexes.error) throw indexes.error
    const position = id => assignment.items.findIndex(item => item.assignmentItemId === id)
    return { pupils: roster.map((studentId, index) => {
      const own = latest.get(studentId)
      // The pupil index decides order and membership, as in the pupil evidence read.
      const entries = [...new Set(indexes[index] || [])].filter(id => own.has(id)).map(id => {
        const { item, saved, review } = own.get(id)
        return hasEvidenceTime(saved) ? screeningEvidenceEntry({ attemptId: id, studentId, classId: assignment.classId,
          record: saved.record, item, saved, review }) : null
      }).filter(Boolean)
      return { studentId, answers: screeningPupilAnswers(entries.map(withTeacherAssessment))
        .map(answer => ({ ...answer, position: position(answer.assignmentItemId) })) }
    }) }
  } catch (error) {
    if (req) logUnexpectedDiagnosticError('teacher-diagnostic-attempts', req, error)
    return { error: 'Kunde inte hämta felförståelserna.' }
  }
}
