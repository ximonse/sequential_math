export function evaluateArithmeticExpressionsProblem(problem, studentAnswer) {
  const correct = Number(problem.answer?.value)
  const student = Number(String(studentAnswer).replace(',', '.'))
  if (!Number.isFinite(correct)) {
    return { correct: false, correctAnswer: String(problem.answer?.value ?? ''), isReasonable: false }
  }
  const isClose = Number.isFinite(student) && Math.abs(student - correct) < 0.005
  return {
    correct: isClose,
    correctAnswer: String(correct),
    isReasonable: Number.isFinite(student)
  }
}
