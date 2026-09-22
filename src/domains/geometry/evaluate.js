export function evaluateGeometryProblem(problem, studentAnswer) {
  const answer = String(studentAnswer ?? '').trim()
  const options = Array.isArray(problem?.values?.options) ? problem.values.options : []
  const selected = options.find(item => item.id === answer)
  const correctOption = options.find(item => item.id === problem?.answer?.correct)
  return {
    correct: Boolean(selected && answer === String(problem?.answer?.correct || '')),
    studentAnswer: answer,
    correctAnswer: correctOption?.label || '',
    isReasonable: Boolean(selected),
    absError: null,
    relativeError: null
  }
}

