export const ERROR_CATEGORIES = new Set([
  'none',
  'input',
  'knowledge',
  'inattention',
  'misconception'
])

function invariant(condition, message) {
  if (!condition) throw new Error(`Domain contract violation: ${message}`)
}

function isLevel(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 12
}

export function assertDomainContract(domain) {
  invariant(domain && typeof domain === 'object', 'domain must be an object')
  invariant(String(domain.id || '').trim(), 'domain.id is required')
  invariant(String(domain.label || '').trim(), `${domain.id}.label is required`)
  invariant(Array.isArray(domain.skills) && domain.skills.length > 0, `${domain.id}.skills must not be empty`)
  invariant(typeof domain.generate === 'function', `${domain.id}.generate is required`)
  invariant(typeof domain.evaluate === 'function', `${domain.id}.evaluate is required`)
  invariant(typeof domain.analyzeError === 'function', `${domain.id}.analyzeError is required`)

  const ids = new Set()
  for (const skill of domain.skills) {
    const id = String(skill?.id || '').trim()
    invariant(id, `${domain.id} has a skill without id`)
    invariant(!ids.has(id), `${domain.id} has duplicate skill ${id}`)
    invariant(String(skill?.label || '').trim(), `${domain.id}.${id}.label is required`)
    invariant(isLevel(skill?.levels?.[0]) && isLevel(skill?.levels?.[1]), `${domain.id}.${id}.levels is invalid`)
    invariant(Number(skill.levels[0]) <= Number(skill.levels[1]), `${domain.id}.${id}.levels is reversed`)
    ids.add(id)
  }
  return domain
}

export function assertProblemContract(problem, expected = {}) {
  invariant(problem && typeof problem === 'object', 'generated problem must be an object')
  const domain = String(problem.domain || '').trim()
  const skill = String(problem.skill || problem.metadata?.skillTag || '').trim()
  invariant(domain, 'problem.domain is required')
  invariant(skill, 'problem skill is required')
  invariant(isLevel(problem.level), 'problem.level must be 1-12')
  invariant(isLevel(problem.difficulty?.conceptual_level), 'problem.difficulty.conceptual_level must be 1-12')
  invariant(Number(problem.level) === Number(problem.difficulty.conceptual_level), 'problem level fields must agree')
  invariant(problem.answer && typeof problem.answer === 'object', 'problem.answer is required')
  invariant(String(problem.answer.type || '').trim(), 'problem.answer.type is required')
  const hasAnswer = problem.answer.correct !== undefined
    || problem.answer.value !== undefined
    || (problem.answer.num !== undefined && problem.answer.den !== undefined)
  invariant(hasAnswer, 'problem.answer has no expected value')
  invariant(problem.metadata && typeof problem.metadata === 'object', 'problem.metadata is required')
  if (expected.domain) invariant(domain === expected.domain, `expected domain ${expected.domain}, got ${domain}`)
  if (expected.skill) invariant(skill === expected.skill, `expected skill ${expected.skill}, got ${skill}`)
  return problem
}

export function assertEvaluationContract(evaluation) {
  invariant(evaluation && typeof evaluation === 'object', 'evaluation must be an object')
  invariant(typeof evaluation.correct === 'boolean', 'evaluation.correct must be boolean')
  invariant(typeof evaluation.isReasonable === 'boolean', 'evaluation.isReasonable must be boolean')
  return evaluation
}

export function assertErrorAnalysisContract(analysis) {
  invariant(analysis && typeof analysis === 'object', 'error analysis must be an object')
  invariant(ERROR_CATEGORIES.has(analysis.category), `unknown error category ${analysis.category}`)
  invariant(Array.isArray(analysis.patterns), 'error patterns must be an array')
  invariant(typeof analysis.detail === 'string', 'error detail must be a string')
  return analysis
}
