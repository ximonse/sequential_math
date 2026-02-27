import { selectNextProblem } from '../lib/difficultyAdapter'
import { getOperationAbility } from '../lib/difficultyAdapterProfileHelpers'
import { getLowestUnmasteredLevel } from '../lib/studentProfile'
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

const ALGEBRA_SKILLS = new Set(['algebra_evaluate', 'algebra_simplify'])
const EXPRESSION_SKILLS = new Set(['arithmetic_expressions'])
const FRACTION_SKILLS = new Set(['fractions'])
const PERCENTAGE_SKILLS = new Set(['percentage'])

export function selectNextProblemForProfile(profile, options = {}) {
  const allowedTypes = Array.isArray(options.allowedTypes) ? options.allowedTypes : []
  const isAlgebra = allowedTypes.length > 0 && allowedTypes.every(t => ALGEBRA_SKILLS.has(t))
  const isExpressions = allowedTypes.length > 0 && allowedTypes.every(t => EXPRESSION_SKILLS.has(t))
  const isFractions = allowedTypes.length > 0 && allowedTypes.every(t => FRACTION_SKILLS.has(t))

  function sampleTrainingLevel(skill) {
    // Level-focus (Framsteg-klick) — exakt den nivån, ingen mix
    if (Number.isFinite(Number(options.forcedLevel))) return Number(options.forcedLevel)

    const floor = getLowestUnmasteredLevel(profile, skill)
    const target = floor

    // Distribution: ~70% target, ~15% lättare, ~15% svårare
    const roll = Math.random()
    if (roll < 0.15 && target > 1) return target - 1   // kognitiv avlastning
    if (roll < 0.30 && target < 12) return target + 1   // utmaning
    return target                                         // kärnträning
  }

  if (isAlgebra) {
    const algebraDomain = getDomain('algebra')
    if (algebraDomain && typeof algebraDomain.generate === 'function') {
      const skill = allowedTypes[0]
      return algebraDomain.generate(skill, sampleTrainingLevel(skill), options)
    }
  }

  if (isExpressions) {
    const exprDomain = getDomain('arithmetic_expressions')
    if (exprDomain && typeof exprDomain.generate === 'function') {
      return exprDomain.generate('arithmetic_expressions', sampleTrainingLevel('arithmetic_expressions'), options)
    }
  }

  if (isFractions) {
    const fracDomain = getDomain('fractions')
    if (fracDomain && typeof fracDomain.generate === 'function') {
      return fracDomain.generate('fractions', sampleTrainingLevel('fractions'), options)
    }
  }

  const isPercentage = allowedTypes.length > 0 && allowedTypes.every(t => PERCENTAGE_SKILLS.has(t))
  if (isPercentage) {
    const pctDomain = getDomain('percentage')
    if (pctDomain && typeof pctDomain.generate === 'function') {
      return pctDomain.generate('percentage', sampleTrainingLevel('percentage'), options)
    }
  }

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
