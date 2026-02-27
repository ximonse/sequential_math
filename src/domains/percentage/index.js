import { generatePercentageProblem } from './generate.js'
import { evaluatePercentageProblem } from './evaluate.js'
import { analyzePercentageError } from './analyzeError.js'

const percentageDomain = {
  id: 'percentage',
  label: 'Procenträkning',
  skills: [{ id: 'percentage', label: 'Procenträkning', levels: [1, 12] }],
  generate(skill, level, options) { return generatePercentageProblem(skill, level, options) },
  evaluate(problem, studentAnswer) { return evaluatePercentageProblem(problem, studentAnswer) },
  analyzeError(problem, studentAnswer) { return analyzePercentageError(problem, studentAnswer) },
  normalizeLegacyProblem(problem) { return problem }
}

export default percentageDomain
