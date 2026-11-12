// Analysis and follow-ups read the teacher's judgement of a screening answer
// when one is saved for the current revision (Simon 2026-11-12: otherwise the
// analysis is wrong). The pupil's own answer and status stay in `observed`.
// The evidence revision is hashed before this, so a changed judgement never
// invalidates the source references.
export function withTeacherAssessment(entry) {
  const assessment = entry?.source === 'screening' ? entry.teacherReview?.assessment : null
  if (!assessment || !entry.answer) return entry
  const { status, studentAnswer } = entry.answer
  return { ...entry, answer: { ...entry.answer,
    status: assessment.answerStatus, studentAnswer: assessment.teacherAnswer ?? studentAnswer,
    teacherAssessed: true, observed: { status, studentAnswer },
    ...(assessment.misconception ? { teacherMisconceptionSv: assessment.misconception } : {}) } }
}

// A short label for views that show the analysed answer.
export function teacherAssessedNote(answer) {
  if (!answer?.teacherAssessed) return ''
  const pupil = answer.observed?.studentAnswer ?? 'inget svar'
  return `Lärarbedömt; eleven skrev ${pupil}.`
}
