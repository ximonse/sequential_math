import { parseFraction, fractionsEqual, formatFraction } from './fractionMath'

export function evaluateFractionsProblem(problem, studentAnswer) {
  const correctNum = Number(problem.answer?.num)
  const correctDen = Number(problem.answer?.den ?? 1)
  const correctStr = formatFraction(correctNum, correctDen)

  const parsed = parseFraction(studentAnswer)
  const correct = parsed !== null && fractionsEqual(parsed, { num: correctNum, den: correctDen })

  return { correct, correctAnswer: correctStr }
}
