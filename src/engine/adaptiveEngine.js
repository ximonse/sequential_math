import { selectNextProblem } from '../lib/difficultyAdapter'
import { resolveProblemOperation } from '../lib/mathUtils'
import { getDefaultDomainId, getDomain, normalizeProblemWithDomain } from '../domains/registry'
import { assertErrorAnalysisContract, assertEvaluationContract, assertProblemContract } from '../domains/contracts'
import { resolveScopedSelection } from './scopedSelection'
import { getConsecutiveOperationErrors, getWarmupLevel } from '../lib/difficultyAdapterProfileHelpers'
import { getLowestUnmasteredLevel } from '../lib/studentProfile'
import { chooseHiddenDecimalEvidence } from './hiddenDecimalPolicy'

function inferSkillFromProblem(problem) {
  const operation = resolveProblemOperation(problem, { fallback: '' })
  if (operation) return operation
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
  const scoped = resolveScopedSelection(profile, options)
  if (scoped) {
    return { domain: scoped.domain.id, skill: scoped.skill, level: scoped.level }
  }

  return {
    domain: getDefaultDomainId(),
    skill: 'addition',
    level: Math.max(1, Math.min(12, Math.round(Number(options.forcedLevel ?? profile?.currentDifficulty) || 1)))
  }
}

function generateFromDomain(domain, skill, level, options) {
  const problem = domain.generate(skill, level, options)
  return assertProblemContract(problem, { domain: domain.id, skill })
}

function sampleTrainingLevel(profile, selection, options) {
  if (Number.isFinite(Number(options.forcedLevel))) return selection.level

  const [minimumLevel, maximumLevel] = selection.levelRange
  const warmupLevel = getWarmupLevel(profile, selection.level, selection.skill)
  if (warmupLevel !== null) {
    return Math.max(minimumLevel, Math.min(maximumLevel, warmupLevel))
  }

  if (getConsecutiveOperationErrors(profile, selection.skill) >= 3) {
    return Math.max(minimumLevel, selection.level - 1)
  }

  const roll = Math.random()
  if (roll < 0.15 && selection.level > minimumLevel) return selection.level - 1
  if (roll < 0.30 && selection.level < maximumLevel) return selection.level + 1
  return selection.level
}

function generateScopedProblem(profile, selection, options) {
  const level = sampleTrainingLevel(profile, selection, options)
  if (selection.domain.id === getDefaultDomainId()) {
    const evidenceSkill = chooseHiddenDecimalEvidence({
      skill: selection.skill,
      level,
      forcedLevel: options.forcedLevel,
      decimalFloor: getLowestUnmasteredLevel(profile, 'positions_decimal', 6)
    })
    if (evidenceSkill) {
      return generateFromDomain(selection.domain, selection.skill, level, { ...options, evidenceSkill })
    }

    const legacyProblem = selectNextProblem(profile, {
      ...options,
      allowedTypes: [selection.skill],
      forcedType: selection.skill,
      forcedLevel: level
    })
    return assertProblemContract(normalizeProblemWithDomain(legacyProblem))
  }

  return generateFromDomain(selection.domain, selection.skill, level, options)
}

export function selectNextProblemForProfile(profile, options = {}) {
  const scoped = resolveScopedSelection(profile, options)
  if (scoped) return generateScopedProblem(profile, scoped, options)

  const legacyProblem = selectNextProblem(profile, options)
  return assertProblemContract(normalizeProblemWithDomain(legacyProblem))
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
  return assertEvaluationContract(domain.evaluate(normalizedProblem, studentAnswer))
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
  return assertErrorAnalysisContract(domain.analyzeError(normalizedProblem, studentAnswer))
}

export function createProblemForSelection(selection, options = {}) {
  const domainId = String(selection?.domain || getDefaultDomainId())
  const domain = getDomain(domainId) || getDomain(getDefaultDomainId())
  if (!domain || typeof domain.generate !== 'function') return null
  const skill = String(selection?.skill || 'addition')
  const level = Number(selection?.level || 1)
  return generateFromDomain(domain, skill, level, options)
}

export function getProblemSelection(problem) {
  const normalizedProblem = normalizeProblemWithDomain(problem)
  return {
    domain: String(normalizedProblem?.domain || getDefaultDomainId()),
    skill: inferSkillFromProblem(normalizedProblem),
    level: inferLevelFromProblem(normalizedProblem)
  }
}
