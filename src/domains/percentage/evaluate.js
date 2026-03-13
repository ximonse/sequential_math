export function evaluatePercentageProblem(problem, studentAnswer) {
  const correct = Number(problem.answer?.correct ?? problem.result)
  const student = Number(String(studentAnswer).replace(',', '.'))
  const isClose = Number.isFinite(student)
    && Number.isFinite(correct)
    && Math.abs(student - correct) < 0.005
  return {
    correct: isClose,
    correctAnswer: String(correct),
    isReasonable: Number.isFinite(student) && student >= 0
  }
}
