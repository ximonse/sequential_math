export function analyzeArithmeticExpressionsError(problem, studentAnswer) {
  const correct = Number(problem.answer?.value)
  const student = Number(studentAnswer)
  if (!Number.isFinite(student)) {
    return { category: 'input', detail: 'invalid_input', patterns: ['invalid_input'] }
  }
  if (Number.isFinite(correct) && Math.abs(student - correct) < 0.005) {
    return { category: 'none', detail: '', patterns: [] }
  }
  return {
    category: 'knowledge',
    detail: 'wrong_order_of_operations',
    patterns: ['wrong_order_of_operations']
  }
}
