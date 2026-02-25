import { generateFractionsProblem } from './generate'
import { evaluateFractionsProblem } from './evaluate'
import { analyzeFractionsError } from './analyzeError'
import FractionsDisplay from './FractionsDisplay'

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
  analyzeError(problem, studentAnswer) {
    return analyzeFractionsError(problem, studentAnswer)
  },
  normalizeLegacyProblem(problem) { return problem }
}

export default fractionsDomain
