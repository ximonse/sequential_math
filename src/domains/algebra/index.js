import { generateAlgebraProblem, normalizeAlgebraLegacyProblem } from './generate'
import { evaluateAlgebraProblem } from './evaluate'
import { analyzeAlgebraError } from './analyzeError'
import AlgebraDisplay from './AlgebraDisplay'

const algebraDomain = {
  id: 'algebra',
  label: 'Algebra',
  skills: [
    { id: 'algebra_evaluate', label: 'Räkna ut algebraiska uttryck', levels: [1, 12] },
    { id: 'algebra_simplify', label: 'Förenkla algebraiska uttryck', levels: [1, 12] }
  ],
  generate(skill, level, options = {}) {
    return generateAlgebraProblem(skill, level, options)
  },
  Display: AlgebraDisplay,
  evaluate(problem, studentAnswer) {
    return evaluateAlgebraProblem(problem, studentAnswer)
  },
  analyzeError(problem, studentAnswer) {
    return analyzeAlgebraError(problem, studentAnswer)
  },
  normalizeLegacyProblem(problem) {
    return normalizeAlgebraLegacyProblem(problem)
  }
}

export default algebraDomain
