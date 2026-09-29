import { evaluateNumberFluencyProblem } from './evaluate.js'

export function analyzeNumberFluencyError(problem, studentAnswer) {
  if (evaluateNumberFluencyProblem(problem, studentAnswer).correct) {
    return { category: 'none', patterns: [], detail: '' }
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
