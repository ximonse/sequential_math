import { kv } from '@vercel/kv'
import { pupilScreeningEvidence } from './_pupilScreeningEvidence.js'
import { listDiagnosticAssignmentAttempts } from './_diagnosticClassOverview.js'
import { withTeacherAssessment } from '../src/lib/evidenceTeacherAssessment.js'
import { screeningPupilAnswers } from '../src/lib/screeningMisconceptions.js'

// Each pupil's answers in one screening, classified as in the coverage count
// and the pupil report (docs/STYRNING_FELFORSTAELSER.md, step 4). Only the
// latest attempt per task counts, as in the results matrix.
export async function screeningMisconceptionPupils(assignment, studentIds, { store = kv } = {}) {
  const roster = studentIds.filter(id => assignment.studentIds.includes(id))
  const records = await listDiagnosticAssignmentAttempts(assignment, roster, { store })
  const latest = new Set()
  for (const studentId of roster) {
    for (const item of assignment.items) {
      const record = records.filter(r => r.studentId === studentId && r.assignmentItemId === item.assignmentItemId)
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0) || a.attemptId.localeCompare(b.attemptId))[0]
      if (record) latest.add(record.attemptId)
    }
  }
  const pupils = []
  for (const studentId of roster) {
    const { entries } = await pupilScreeningEvidence(studentId, assignment.classId, { store })
    const own = entries.filter(entry => entry.reference?.assignmentId === assignment.assignmentId && latest.has(entry.reference.attemptId))
    // The position lets the client match answers across classes, as the results table does.
    const position = id => assignment.items.findIndex(item => item.assignmentItemId === id)
    pupils.push({ studentId, answers: screeningPupilAnswers(own.map(withTeacherAssessment))
      .map(answer => ({ ...answer, position: position(answer.assignmentItemId) })) })
  }
  return { pupils }
}
