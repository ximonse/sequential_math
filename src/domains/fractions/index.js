import { generateFractionsProblem } from './generate'
import { evaluateFractionsProblem } from './evaluate'
import { analyzeFractionsError } from './analyzeError'
import FractionsDisplay from './FractionsDisplay'
import { verifyFractionsContent } from './verifyContent.js'

const fractionsDomain = {
  id: 'fractions',
  label: 'Bråk',
  skills: [
    { id: 'fractions', label: 'Bråkräkning', levels: [1, 12] }
  ],
  generate(skill, level, options) {
    return generateFractionsProblem(skill, level, options)
  },
  Display: FractionsDisplay,
  evaluate(problem, studentAnswer) {
    return evaluateFractionsProblem(problem, studentAnswer)
  },
  verifyContent(problem) {
    return verifyFractionsContent(problem)
  },
  analyzeError(problem, studentAnswer) {
    return analyzeFractionsError(problem, studentAnswer)
  },
  normalizeLegacyProblem(problem) { return problem }
}

export default fractionsDomain
