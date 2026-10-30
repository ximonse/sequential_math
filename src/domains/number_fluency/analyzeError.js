import { evaluateNumberFluencyProblem } from './evaluate.js'
import { isLeadingDigitOnly, PARTIAL_ENTRY_ANALYSIS } from '../arithmetic/errorHypotheses/commonHypotheses.js'

export function analyzeNumberFluencyError(problem, studentAnswer) {
  const evaluation = evaluateNumberFluencyProblem(problem, studentAnswer)
  if (evaluation.correct) {
    return { category: 'none', patterns: [], detail: '' }
  }
  if (isLeadingDigitOnly(evaluation.correctAnswer, Number(String(studentAnswer).replace(',', '.')))) {
    return { ...PARTIAL_ENTRY_ANALYSIS }
  }
  const pattern = problem?.skill === 'number_bonds' ? 'number_bond_not_recalled' : 'double_not_recalled'
  return {
    category: 'knowledge',
    patterns: [pattern],
    detail: problem?.skill === 'number_bonds'
      ? 'Talparet återkallades inte korrekt.'
      : 'Dubblan återkallades eller överfördes inte korrekt.'
  }
}
