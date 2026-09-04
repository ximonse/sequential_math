import { evaluatePercentageProblem } from './evaluate.js'

export function analyzePercentageError(problem, studentAnswer) {
  if (evaluatePercentageProblem(problem, studentAnswer).correct) {
    return { category: 'none', detail: '', patterns: [] }
  }

  return {
    category: 'knowledge',
    detail: 'wrong_percentage',
    patterns: ['wrong_percentage']
  }
}
