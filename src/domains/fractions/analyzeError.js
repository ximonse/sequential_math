import {
  fractionsEqual,
  isReducedFraction,
  parseFraction,
  parseFractionRaw
} from './fractionMath'
import { evaluateFractionsProblem } from './evaluate'

export function analyzeFractionsError(problem, studentAnswer) {
  const correct = { num: Number(problem.answer?.num), den: Number(problem.answer?.den ?? 1) }
  const evaluation = evaluateFractionsProblem(problem, studentAnswer)
  if (evaluation.correct) {
    const raw = parseFractionRaw(studentAnswer)
    if (evaluation.isPartial && raw && !isReducedFraction(raw)) {
      return {
        category: 'knowledge',
        patterns: ['not_simplified'],
        detail: 'Rätt värde men svaret är inte förenklat.'
      }
    }
    return { category: 'none', patterns: [], detail: '' }
  }

  const rawParsed = parseFractionRaw(studentAnswer)
  if (!rawParsed) {
    return {
      category: 'knowledge',
      patterns: ['invalid_input'],
      detail: 'Svaret kunde inte tolkas som ett bråk.'
    }
  }

  const reducedParsed = parseFraction(studentAnswer)
  if (reducedParsed && fractionsEqual(reducedParsed, correct)) {
    return {
      category: 'knowledge',
      patterns: ['not_simplified'],
      detail: 'Rätt värde men svaret är inte förenklat.'
    }
  }

  if (Number.isFinite(correct.den) && rawParsed.den !== correct.den) {
    return {
      category: 'knowledge',
      patterns: ['wrong_denominator'],
      detail: 'Nämnaren stämmer inte.'
    }
  }

  return {
    category: 'knowledge',
    patterns: ['wrong_answer'],
    detail: 'Fel svar.'
  }
}
