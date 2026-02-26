export function evaluateArithmeticExpressionsProblem(problem, studentAnswer) {
  const correct = Number(problem.answer?.value)
  const student = Number(studentAnswer)
  if (!Number.isFinite(correct)) {
    return { correct: false, correctAnswer: String(problem.answer?.value ?? ''), isReasonable: false }
  }
  return {
    correct: Number.isFinite(student) && student === correct,
    correctAnswer: String(correct),
    isReasonable: Number.isFinite(student)
  }
}
