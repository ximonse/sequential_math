import { describe, expect, it } from 'vitest'
import { createDiagnosticGrid, recordDiagnosticGridEvent } from './diagnosticGridModel.js'
import { summarizeDiagnosticObservation } from './diagnosticObservation.js'
import { acceptsTeacherAnswer, assessWithTeacher, currentTeacherAssessment, teacherAssessmentFields } from './diagnosticTeacherAssessment.js'

const task = { taskId: 'TASK', taskVersion: 1, operation: 'subtraction', operands: [402, 178], answerRule: 'integer_subtraction', promptSv: 'Räkna ut 402 − 178.' }
function snapshot(answer) {
  let grid = createDiagnosticGrid({ attemptId: 'TRY', taskId: 'TASK', taskVersion: 1 })
  if (answer) grid = recordDiagnosticGridEvent(grid, { type: 'answer_change', before: '', after: answer }, 1)
  return grid
}

describe('teacher assessment of a screening answer', () => {
  it('marks a typed answer with the same rules and leaves the pupil observation unchanged', () => {
    const empty = snapshot('')
    expect(summarizeDiagnosticObservation(task, empty).answerStatus).toBe('unanswered')
    expect(assessWithTeacher(task, empty, 'unanswered', { markedCorrect: false, teacherAnswer: '224', misconception: '' }))
      .toMatchObject({ teacherAnswer: '224', teacherAnswerStatus: 'correct', answerStatus: 'correct' })
    expect(assessWithTeacher(task, empty, 'unanswered', { markedCorrect: false, teacherAnswer: '376', misconception: '' }).answerStatus).toBe('incorrect')
    expect(summarizeDiagnosticObservation(task, empty).explicitAnswer).toBeNull()
  })
  it('lets the teacher verdict win and keeps a misconception on a correct answer', () => {
    expect(assessWithTeacher(task, snapshot('376'), 'incorrect', { markedCorrect: true, teacherAnswer: '', misconception: '' }).answerStatus).toBe('correct')
    expect(assessWithTeacher(task, snapshot('224'), 'correct', { markedCorrect: false, teacherAnswer: '', misconception: 'Lånar fel.' }))
      .toMatchObject({ answerStatus: 'correct', misconception: 'Lånar fel.' })
  })
  it('applies only to the reviewed revision and ignores empty assessments', () => {
    const record = { serverRevision: 2, lastSequence: 4 }
    const review = { evidenceRevision: 2, evidenceSequence: 4, markedCorrect: true }
    expect(currentTeacherAssessment(review, record)).toEqual({ markedCorrect: true, teacherAnswer: '', misconception: '', misconceptionIds: [] })
    expect(currentTeacherAssessment(review, { ...record, lastSequence: 5 })).toBeNull()
    expect(currentTeacherAssessment({ ...review, markedCorrect: false }, record)).toBeNull()
  })
  it('accepts only approved misconceptions from the list, at most five', () => {
    const fields = ids => teacherAssessmentFields({ misconceptionIds: ids })
    expect(fields(['regrouping_not_understood', 'regrouping_not_understood'])?.misconceptionIds).toEqual(['regrouping_not_understood'])
    expect(fields(['not_in_catalogue'])).toBeNull()
    expect(fields('regrouping_not_understood')).toBeNull()
    expect(fields(Array(6).fill('regrouping_not_understood'))).toBeNull()
    expect(teacherAssessmentFields({}, { misconceptionIds: ['regrouping_not_understood'] }).misconceptionIds).toEqual(['regrouping_not_understood'])
  })
  it('offers a typed answer only where the app marks typed answers', () => {
    expect(acceptsTeacherAnswer(task)).toBe(true)
    expect(acceptsTeacherAnswer({ ...task, answerType: 'text' })).toBe(false)
    expect(acceptsTeacherAnswer({ ...task, responseMode: 'single' })).toBe(false)
  })
})
