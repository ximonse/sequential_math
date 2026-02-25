export function analyzeArithmeticExpressionsError(problem, studentAnswer) {
  const correct = Number(problem.answer?.value)
  const student = Number(studentAnswer)
  if (!Number.isFinite(student)) return { errorCategory: 'invalid_input' }
  if (student === correct) return null
  return { errorCategory: 'wrong_order_of_operations' }
}
