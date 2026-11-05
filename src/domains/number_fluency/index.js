import { generateNumberFluencyProblem } from './generate.js'
import { evaluateNumberFluencyProblem } from './evaluate.js'
import { analyzeNumberFluencyError } from './analyzeError.js'
import { verifyNumberFluencyContent } from './verifyContent.js'

const numberFluencyDomain = {
  id: 'number_fluency',
  label: 'Talautomatisering',
  skills: [
    { id: 'number_bonds', label: 'Talpar', levels: [1, 12] },
    { id: 'doubles', label: 'Dubblor', levels: [1, 12] }
  ],
  generate(skill, level) {
    return generateNumberFluencyProblem(skill, level)
  },
  Display: null,
  evaluate(problem, studentAnswer) {
    return evaluateNumberFluencyProblem(problem, studentAnswer)
  },
  verifyContent(problem) {
    return verifyNumberFluencyContent(problem)
  },
  analyzeError(problem, studentAnswer) {
    return analyzeNumberFluencyError(problem, studentAnswer)
  },
  normalizeLegacyProblem(problem) { return problem }
}

export default numberFluencyDomain
