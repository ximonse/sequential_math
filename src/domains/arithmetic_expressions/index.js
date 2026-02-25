import { generateArithmeticExpressionsProblem } from './generate'
import { evaluateArithmeticExpressionsProblem } from './evaluate'
import { analyzeArithmeticExpressionsError } from './analyzeError'

const arithmeticExpressionsDomain = {
  id: 'arithmetic_expressions',
  label: 'Aritmetiska uttryck',
  skills: [
    { id: 'arithmetic_expressions', label: 'Prioriteringsregler', levels: [1, 12] }
  ],
  generate(skill, level, options) {
    return generateArithmeticExpressionsProblem(skill, level, options)
  },
  evaluate(problem, studentAnswer) {
    return evaluateArithmeticExpressionsProblem(problem, studentAnswer)
  },
  analyzeError(problem, studentAnswer) {
    return analyzeArithmeticExpressionsError(problem, studentAnswer)
  },
  normalizeLegacyProblem(problem) { return problem }
}

export default arithmeticExpressionsDomain
