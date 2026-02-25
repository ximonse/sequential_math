import { evaluateAnswerQuality } from '../../lib/answerQuality'

const EPSILON = 0.0001

function normalizeExpectedAnswer(problem) {
  const answer = Number(problem?.answer?.correct)
  if (Number.isFinite(answer)) return answer
  return Number(problem?.result)
}

export function evaluateArithmeticProblem(problem, studentAnswer) {
  const expectedAnswer = normalizeExpectedAnswer(problem)
  const numericStudentAnswer = Number(studentAnswer)
  const correct = Number.isFinite(numericStudentAnswer)
    && Number.isFinite(expectedAnswer)
    && Math.abs(numericStudentAnswer - expectedAnswer) < EPSILON

  const quality = evaluateAnswerQuality({
    problemType: problem?.template || problem?.problemType || 'arithmetic',
    values: problem?.values || {},
    correctAnswer: expectedAnswer,
    studentAnswer: numericStudentAnswer,
    difficulty: problem?.difficulty || {}
  })

  return {
    correct,
    studentAnswer: numericStudentAnswer,
    isReasonable: quality.isReasonable,
    absError: quality.absError,
    relativeError: quality.relativeError,
    tolerance: quality.tolerance
  }
}
