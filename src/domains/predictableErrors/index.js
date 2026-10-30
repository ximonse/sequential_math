import { arithmeticCandidates } from './arithmetic.js'
import { fractionCandidates, strictFraction, sameFraction } from './fractions.js'
import { expressionCandidates } from './expressions.js'
import { percentageCandidates } from './percentage.js'
import { algebraCandidates, linearForm, sameLinear } from './algebra.js'
import { fluencyCandidates } from './fluency.js'
import { numeric, sameNumber, unavailable } from './core.js'

const domains = { arithmetic: arithmeticCandidates, fractions: fractionCandidates,
  arithmetic_expressions: expressionCandidates, percentage: percentageCandidates,
  algebra: algebraCandidates, number_fluency: fluencyCandidates }

export function predictableCandidates(problem, answer) {
  const analyze = domains[problem?.domain]
  return analyze ? analyze(problem, answer) : unavailable(problem?.domain)
}

export function matchesComputedCorrect(result, value) {
  if (result.answerType === 'fraction') return sameFraction(strictFraction(result.computedCorrect), strictFraction(value))
  if (result.answerType === 'linear') return sameLinear(linearForm(result.computedCorrect), linearForm(value))
  return sameNumber(numeric(result.computedCorrect), numeric(value))
}

// Projection only: source labels, source grading and pupil records remain intact.
export function candidatesForEvidence(entry) {
  const q = entry?.question ?? {}, status = entry?.answer?.status
  if (!['correct', 'incorrect'].includes(status)) return unavailable(q.domain, 'source_not_fully_assessed')
  const operation = q.operation ?? q.skill
  const domain = q.domain ?? (['addition', 'subtraction', 'multiplication', 'division'].includes(operation) ? 'arithmetic' : null)
  const values = q.values ?? (Array.isArray(q.operands) && q.operands.length === 2 ? { a: q.operands[0], b: q.operands[1] } : {})
  const result = predictableCandidates({ domain, skill: q.skill ?? operation, type: operation,
    values, display: { text: q.promptSv ?? q.promptText } }, entry.answer.studentAnswer)
  if (result.status !== 'not_applicable' && entry.answer.correctAnswer == null) return unavailable(domain, 'source_correct_answer_unknown')
  if (result.status !== 'not_applicable' && !matchesComputedCorrect(result, entry.answer.correctAnswer)) {
    return { ...unavailable(domain, 'computed_and_source_answer_conflict'), ruleVersion: result.ruleVersion }
  }
  if (result.status !== 'not_applicable' && ((status === 'correct') !== (result.status === 'correct'))) {
    return unavailable(domain, 'source_grading_requires_review')
  }
  // Keep model detail for hits; do not send every hypothetical wrong answer to AI.
  const { predictions: _predictions, ...compact } = result
  return { ...compact, testedModelIds: [...new Set((result.predictions ?? []).map(p => p.modelId))] }
}
