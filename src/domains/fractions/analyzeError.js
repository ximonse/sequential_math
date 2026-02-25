import { parseFraction, fractionsEqual } from './fractionMath'

export function analyzeFractionsError(problem, studentAnswer) {
  const correct = { num: Number(problem.answer?.num), den: Number(problem.answer?.den ?? 1) }
  const parsed = parseFraction(studentAnswer)
  if (!parsed) return { errorCategory: 'invalid_input' }
  if (fractionsEqual(parsed, correct)) return null

  // Check if they got the right value but didn't simplify
  if (parsed.num / parsed.den === correct.num / correct.den) {
    return { errorCategory: 'not_simplified' }
  }
  // Check if they added/subtracted numerators without finding common denominator
  const rawNum = Number((problem.answer?.value || '').split('/')[0])
  if (!isNaN(rawNum) && parsed.den !== correct.den) {
    return { errorCategory: 'wrong_denominator' }
  }
  return { errorCategory: 'wrong_answer' }
}
