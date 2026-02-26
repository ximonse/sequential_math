export function evaluatePercentageProblem(problem, studentAnswer) {
  const correct = Number(problem.answer?.correct ?? problem.result)
  const student = Number(String(studentAnswer).replace(',', '.'))
  return {
    correct: Number.isFinite(student) && student === correct,
    correctAnswer: String(correct),
    isReasonable: Number.isFinite(student) && student >= 0
  }
}
