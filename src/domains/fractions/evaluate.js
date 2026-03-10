import {
  fractionsEqual,
  formatFraction,
  isReducedFraction,
  parseFraction,
  parseFractionRaw
} from './fractionMath'

export function evaluateFractionsProblem(problem, studentAnswer) {
  const correctNum = Number(problem.answer?.num)
  const correctDen = Number(problem.answer?.den ?? 1)
  const correctStr = formatFraction(correctNum, correctDen)
  const requiresSimplifiedAnswer = Boolean(problem?.metadata?.requiresSimplifiedAnswer)

  const rawParsed = parseFractionRaw(studentAnswer)
  const parsed = parseFraction(studentAnswer)
  const valueIsCorrect = parsed !== null && fractionsEqual(parsed, { num: correctNum, den: correctDen })
  const answerIsReduced = rawParsed !== null && isReducedFraction(rawParsed)
  const isPartial = Boolean(valueIsCorrect && requiresSimplifiedAnswer && !answerIsReduced)

  return {
    correct: valueIsCorrect,
    correctAnswer: correctStr,
    isReasonable: rawParsed !== null,
    isPartial,
    partialCode: isPartial ? 'not_simplified' : '',
    partialDetail: isPartial ? 'Rätt värde, men förenkla svaret fullt ut.' : ''
  }
}
