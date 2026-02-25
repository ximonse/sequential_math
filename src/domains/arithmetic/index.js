import { generateArithmeticProblem, normalizeArithmeticLegacyProblem } from './generate'
import { evaluateArithmeticProblem } from './evaluate'
import { analyzeArithmeticError } from './analyzeError'

const arithmeticDomain = {
  id: 'arithmetic',
  label: 'Aritmetik',
  skills: [
    { id: 'addition', label: 'Addition', levels: [1, 12] },
    { id: 'subtraction', label: 'Subtraktion', levels: [1, 12] },
    { id: 'multiplication', label: 'Multiplikation', levels: [1, 12] },
    { id: 'division', label: 'Division', levels: [1, 12] }
  ],
  generate(skill, level, options = {}) {
    return generateArithmeticProblem(skill, level, options)
  },
  Display: null,
  evaluate(problem, studentAnswer) {
    return evaluateArithmeticProblem(problem, studentAnswer)
  },
  analyzeError(problem, studentAnswer) {
    return analyzeArithmeticError(problem, studentAnswer)
  },
  normalizeLegacyProblem(problem) {
    return normalizeArithmeticLegacyProblem(problem)
  }
}

export default arithmeticDomain
