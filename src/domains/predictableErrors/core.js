export const PREDICTABLE_RULE_VERSION = 'predictable-errors-v1'
export const LIMIT = 1e9

export function numeric(value) {
  if (typeof value === 'string' && /^[+-]?\d+(?:[.,]\d+)?$/.test(value.trim())) value = Number(value.trim().replace(',', '.'))
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= LIMIT ? value : null
}
export const sameNumber = (a, b) => a !== null && b !== null && Math.abs(a - b) <= 1e-9
export const normalizeText = value => String(value ?? '').replace(/\s+/gu, '').replace(/−/gu, '-').replace(/×/gu, '*').replace(/÷/gu, '/').replace(/,/gu, '.')

export function candidateResult({ domain, correct, answer, predictions, coverageIds = [], scope = null, answerType = 'number', parse = numeric, equal = sameNumber }) {
  const target = parse(correct), observed = parse(answer)
  if (target === null) return unavailable(domain, 'unsupported_correct_value')
  const valid = predictions.filter(p => parse(p.predictedAnswer) !== null)
  const nonDiscriminatingModelIds = [...new Set(valid.filter(p => equal(parse(p.predictedAnswer), target)).map(p => p.modelId))]
  const distinct = valid.filter(p => !equal(parse(p.predictedAnswer), target))
  const matches = observed === null || equal(observed, target) ? [] : distinct.filter(p => equal(parse(p.predictedAnswer), observed))
  return { ruleVersion: PREDICTABLE_RULE_VERSION, domain, scope, answerType, computedCorrect: correct, coverageIds,
    status: observed === null ? 'uninterpretable' : equal(observed, target) ? 'correct' : matches.length ? 'matched' : 'unmatched',
    matches, predictions: distinct, nonDiscriminatingModelIds, limitation: 'model_match_not_proof_of_pupil_method' }
}

export const unavailable = (domain, reason = 'unsupported_structure') => ({ ruleVersion: PREDICTABLE_RULE_VERSION,
  domain: domain ?? 'unknown', status: 'not_applicable', reason, matches: [], predictions: [],
  nonDiscriminatingModelIds: [], limitation: 'no_inference_from_missing_structure' })
export const prediction = (modelId, predictedAnswer, reasonSv) => ({ modelId, predictedAnswer, reasonSv })
