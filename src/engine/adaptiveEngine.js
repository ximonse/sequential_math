import { selectNextProblem } from '../lib/difficultyAdapter'
import { getDefaultDomainId, getDomain, normalizeProblemWithDomain } from '../domains/registry'

function inferSkillFromProblem(problem) {
  const explicitSkill = String(problem?.skill || '').trim()
  if (explicitSkill) return explicitSkill
  const type = String(problem?.type || '').trim()
  if (type === 'addition' || type === 'subtraction' || type === 'multiplication' || type === 'division') {
    return type
  }
  return 'addition'
}

function inferLevelFromProblem(problem) {
  const explicitLevel = Number(problem?.level)
  if (Number.isFinite(explicitLevel) && explicitLevel > 0) {
    return Math.max(1, Math.min(12, Math.round(explicitLevel)))
  }
  const conceptualLevel = Number(problem?.difficulty?.conceptual_level)
  if (Number.isFinite(conceptualLevel) && conceptualLevel > 0) {
    return Math.max(1, Math.min(12, Math.round(conceptualLevel)))
  }
  return 1
}

export function selectNextSkillAndLevel(profile, options = {}) {
  const defaultDomain = getDefaultDomainId()
  const allowedTypes = Array.isArray(options.allowedTypes) ? options.allowedTypes : []
  const skill = allowedTypes.length === 1
    ? String(allowedTypes[0] || 'addition')
    : 'addition'

  const baseLevel = Number.isFinite(Number(options.forcedLevel))
    ? Number(options.forcedLevel)
    : Number(profile?.currentDifficulty || 1)

  return {
    domain: defaultDomain,
    skill,
    level: Math.max(1, Math.min(12, Math.round(baseLevel)))
  }
}

export function selectNextProblemForProfile(profile, options = {}) {
  const legacyProblem = selectNextProblem(profile, options)
  return normalizeProblemWithDomain(legacyProblem)
}

export function evaluateStudentAnswer(problem, studentAnswer) {
  const normalizedProblem = normalizeProblemWithDomain(problem)
  const domainId = String(normalizedProblem?.domain || getDefaultDomainId())
  const domain = getDomain(domainId) || getDomain(getDefaultDomainId())
  if (!domain || typeof domain.evaluate !== 'function') {
    return {
      correct: false,
      studentAnswer: Number(studentAnswer),
      isReasonable: false,
      absError: null,
      relativeError: null
    }
  }
  return domain.evaluate(normalizedProblem, studentAnswer)
}

export function analyzeStudentError(problem, studentAnswer) {
  const normalizedProblem = normalizeProblemWithDomain(problem)
  const domainId = String(normalizedProblem?.domain || getDefaultDomainId())
  const domain = getDomain(domainId) || getDomain(getDefaultDomainId())
  if (!domain || typeof domain.analyzeError !== 'function') {
    return {
      category: 'knowledge',
      patterns: ['unknown'],
      detail: 'Kunde inte analysera felorsak.'
    }
  }
  return domain.analyzeError(normalizedProblem, studentAnswer)
}

export function createProblemForSelection(selection, options = {}) {
  const domainId = String(selection?.domain || getDefaultDomainId())
  const domain = getDomain(domainId) || getDomain(getDefaultDomainId())
  if (!domain || typeof domain.generate !== 'function') return null
  const skill = String(selection?.skill || 'addition')
  const level = Number(selection?.level || 1)
  return domain.generate(skill, level, options)
}

export function getProblemSelection(problem) {
  const normalizedProblem = normalizeProblemWithDomain(problem)
  return {
    domain: String(normalizedProblem?.domain || getDefaultDomainId()),
    skill: inferSkillFromProblem(normalizedProblem),
    level: inferLevelFromProblem(normalizedProblem)
  }
}
