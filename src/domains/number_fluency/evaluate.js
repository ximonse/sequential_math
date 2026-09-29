export function evaluateNumberFluencyProblem(problem, studentAnswer) {
  const expected = Number(problem?.answer?.correct ?? problem?.result)
  const received = Number(String(studentAnswer).replace(',', '.'))
  return {
    correct: Number.isFinite(received) && received === expected,
    correctAnswer: expected,
    isReasonable: Number.isInteger(received) && received >= 0 && received <= 200
  }
}
