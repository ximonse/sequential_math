import arithmeticDomain from './arithmetic'
import algebraDomain from './algebra'
import arithmeticExpressionsDomain from './arithmetic_expressions'
import fractionsDomain from './fractions'
import percentageDomain from './percentage'
import { assertDomainContract } from './contracts'

const domainMap = new Map()

// Every problem needs a stable id: it becomes problemId on the synced event,
// and the server rejects a whole batch when one entry lacks it.
export function ensureProblemId(problem, domainId = '') {
  if (!problem || typeof problem !== 'object') return problem
  if (typeof problem.id === 'string' && problem.id) return problem
  const scope = String(problem.skill || problem.type || domainId || 'problem').trim() || 'problem'
  const random = Math.random().toString(36).slice(2, 7)
  return { ...problem, id: `${scope}_${Date.now()}_${random}` }
}

function registerDomain(domain) {
  const validDomain = assertDomainContract(domain)
  const domainId = String(validDomain.id).trim()
  if (domainMap.has(domainId)) {
    throw new Error(`Domain contract violation: duplicate domain ${domainId}`)
  }
  const generate = validDomain.generate.bind(validDomain)
  domainMap.set(domainId, {
    ...validDomain,
    generate: (skill, level, options) => ensureProblemId(generate(skill, level, options), domainId)
  })
}

registerDomain(arithmeticDomain)
registerDomain(algebraDomain)
registerDomain(arithmeticExpressionsDomain)
registerDomain(fractionsDomain)
registerDomain(percentageDomain)

export function getDomain(domainId) {
  const normalized = String(domainId || '').trim()
  if (!normalized) return null
  return domainMap.get(normalized) || null
}

export function getDomainForSkill(skillId) {
  const normalized = String(skillId || '').trim()
  if (!normalized) return null
  return Array.from(domainMap.values()).find(domain =>
    domain.skills.some(skill => skill.id === normalized)
  ) || null
}

export function listDomains() {
  return Array.from(domainMap.values())
}

export function getDefaultDomainId() {
  return 'arithmetic'
}

export function normalizeProblemWithDomain(problem) {
  if (!problem || typeof problem !== 'object') return problem
  const currentDomainId = String(problem.domain || '').trim() || getDefaultDomainId()
  const domain = getDomain(currentDomainId) || getDomain(getDefaultDomainId())
  if (!domain || typeof domain.normalizeLegacyProblem !== 'function') {
    return ensureProblemId({
      ...problem,
      domain: currentDomainId
    }, currentDomainId)
  }

  return ensureProblemId(domain.normalizeLegacyProblem(problem), currentDomainId)
}
