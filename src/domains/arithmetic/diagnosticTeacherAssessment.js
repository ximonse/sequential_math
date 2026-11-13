import { summarizeDiagnosticObservation } from './diagnosticObservation.js'
import { MATH_ANSWER } from './diagnosticGridModel.js'
import { isChoiceTask } from './screeningImageQuestions.js'
import { approvedMisconception } from '../predictableErrors/misconceptions.js'

// The teacher's own judgement of a screening answer, kept in the review record
// beside the pupil's evidence (Simon 2026-11-11). It never changes the pupil's
// events or the observed answer status; views show both.
export const TEACHER_ANSWER_MAX = 200
export const TEACHER_MISCONCEPTION_MAX = 500
// Approved misconceptions the teacher picked from the list (Simon 2026-11-13).
export const TEACHER_MISCONCEPTION_IDS_MAX = 5

// A teacher can type an answer the pupil forgot only where the app marks a typed answer.
export const acceptsTeacherAnswer = task => !isChoiceTask(task) && task?.answerType !== 'text'
  && task?.answerRule !== 'teacher_review'

// Returns the validated fields; undefined input fields keep the previous value.
export function teacherAssessmentFields(input, previous = {}) {
  const pick = (key, fallback) => input[key] === undefined ? previous?.[key] ?? fallback : input[key]
  const fields = { markedCorrect: pick('markedCorrect', false), teacherAnswer: pick('teacherAnswer', ''),
    misconception: pick('misconception', ''), misconceptionIds: pick('misconceptionIds', []) }
  if (typeof fields.markedCorrect !== 'boolean'
    || typeof fields.teacherAnswer !== 'string' || fields.teacherAnswer.length > TEACHER_ANSWER_MAX
    || (fields.teacherAnswer && !MATH_ANSWER.test(fields.teacherAnswer))
    || typeof fields.misconception !== 'string' || fields.misconception.length > TEACHER_MISCONCEPTION_MAX
    || !Array.isArray(fields.misconceptionIds) || fields.misconceptionIds.length > TEACHER_MISCONCEPTION_IDS_MAX
    || !fields.misconceptionIds.every(id => typeof id === 'string' && approvedMisconception(id))) return null
  return { markedCorrect: fields.markedCorrect, teacherAnswer: fields.teacherAnswer.trim(), misconception: fields.misconception.trim(),
    misconceptionIds: [...new Set(fields.misconceptionIds)] }
}

// Only a review made for the pupil's current revision counts; a later pupil edit makes it stale.
export function currentTeacherAssessment(review, record) {
  if (!review || review.evidenceRevision !== record?.serverRevision || review.evidenceSequence !== record?.lastSequence) return null
  const { markedCorrect = false, teacherAnswer = '', misconception = '', misconceptionIds = [] } = review
  return markedCorrect || teacherAnswer || misconception || misconceptionIds.length
    ? { markedCorrect, teacherAnswer, misconception, misconceptionIds } : null
}

// What the results table counts: the teacher's verdict, else the teacher's
// typed answer marked by the task's rules, else the pupil's observed status.
export function assessWithTeacher(task, snapshot, pupilStatus, assessment) {
  if (!assessment) return null
  const answer = acceptsTeacherAnswer(task) ? assessment.teacherAnswer : ''
  const teacherAnswerStatus = answer ? summarizeDiagnosticObservation(task, snapshot, { answerOverride: answer }).answerStatus : null
  return { markedCorrect: assessment.markedCorrect, teacherAnswer: answer || null, teacherAnswerStatus,
    misconception: assessment.misconception || null,
    // A misconception that leaves the catalogue later is dropped, not shown.
    misconceptionIds: (assessment.misconceptionIds ?? []).filter(id => approvedMisconception(id)),
    answerStatus: assessment.markedCorrect ? 'correct' : teacherAnswerStatus || pupilStatus }
}
