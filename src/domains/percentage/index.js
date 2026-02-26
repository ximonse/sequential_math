import { generatePercentageProblem } from './generate.js'
import { evaluatePercentageProblem } from './evaluate.js'
import { analyzePercentageError } from './analyzeError.js'

export default {
  id: 'percentage',
  skills: [{ id: 'percentage', label: 'Procenträkning' }],
  levels: [1, 12],
  generate: generatePercentageProblem,
  evaluate: evaluatePercentageProblem,
  analyzeError: analyzePercentageError
}
