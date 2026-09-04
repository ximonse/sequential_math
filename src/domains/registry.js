import arithmeticDomain from './arithmetic'
import algebraDomain from './algebra'
import arithmeticExpressionsDomain from './arithmetic_expressions'
import fractionsDomain from './fractions'
import percentageDomain from './percentage'
import { assertDomainContract } from './contracts'

const domainMap = new Map()

function registerDomain(domain) {
  const validDomain = assertDomainContract(domain)
  const domainId = String(validDomain.id).trim()
  if (domainMap.has(domainId)) {
    throw new Error(`Domain contract violation: duplicate domain ${domainId}`)
  }
  domainMap.set(domainId, validDomain)
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
    return {
      ...problem,
      domain: currentDomainId
    }
  }

  return domain.normalizeLegacyProblem(problem)
}
