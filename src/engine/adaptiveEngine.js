import { selectNextProblem } from '../lib/difficultyAdapter'
import { resolveProblemOperation } from '../lib/mathUtils'
import { getDefaultDomainId, getDomain, normalizeProblemWithDomain } from '../domains/registry'
import {
  assertErrorAnalysisContract,
  assertEvaluationContract,
  generateWithProblemGuardian
} from '../domains/contracts'
import { resolveScopedSelection } from './scopedSelection'
import { getConsecutiveOperationErrors } from '../lib/difficultyAdapterProfileHelpers'
import { getLowestUnmasteredLevel } from '../lib/studentProfile'
import { chooseHiddenDecimalEvidence } from './hiddenDecimalPolicy'
import { buildAbsenceWarmupDecision } from '../lib/sessionStartDecision'

function inferSkillFromProblem(problem) {
  const explicitSkill = String(problem?.skill || '').trim()
  if (explicitSkill) return explicitSkill
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
  return generateWithProblemGuardian(
    () => domain.generate(skill, level, options),
    { domain: domain.id, skill, level }
  )
}

function generateFromLegacySelector(profile, options, expected = {}) {
  return generateWithProblemGuardian(
    () => normalizeProblemWithDomain(selectNextProblem(profile, options)),
    expected
  )
}

function sampleTrainingDecision(profile, selection, options) {
  if (Number.isFinite(Number(options.forcedLevel))) {
    return { level: selection.level, startDecision: null }
  }

  const [minimumLevel, maximumLevel] = selection.levelRange
  const activeIntervention = selection.decisionPurpose === 'recover'
    || selection.decisionPurpose === 'support'
  if (!activeIntervention) {
    const startDecision = buildAbsenceWarmupDecision({
      profile,
      operation: selection.skill,
      destinationLevel: selection.level,
      levelRange: selection.levelRange,
      frameId: options.frameId
    })
    if (startDecision) {
      return { level: startDecision.targetLevel, startDecision }
    }
  }

  if (selection.decisionId) {
    return { level: selection.level, startDecision: null }
  }

  if (getConsecutiveOperationErrors(profile, selection.skill) >= 3) {
    return { level: Math.max(minimumLevel, selection.level - 1), startDecision: null }
  }

  const roll = Math.random()
  if (roll < 0.15 && selection.level > minimumLevel) {
    return { level: selection.level - 1, startDecision: null }
  }
  if (roll < 0.30 && selection.level < maximumLevel) {
    return { level: selection.level + 1, startDecision: null }
  }
  return { level: selection.level, startDecision: null }
}

function attachTrainingDecision(problem, selection, level, options, startDecision) {
  const decisionId = startDecision?.decisionId || selection.decisionId
  const purpose = startDecision?.purpose || selection.decisionPurpose
  const selectionReason = startDecision?.reasonCodes?.[0] || options.forceReason
  const ruleVersion = startDecision?.ruleVersion || options.trainingDecisionRuleVersion
  const reasonCodes = startDecision?.reasonCodes || options.trainingReasonCodes
  problem.metadata = {
    ...(problem.metadata || {}),
    ...(decisionId ? { trainingDecisionId: decisionId } : {}),
    ...(ruleVersion ? { trainingDecisionRuleVersion: Number(ruleVersion) } : {}),
    ...(purpose ? { trainingPurpose: purpose } : {}),
    ...(Array.isArray(reasonCodes) ? { trainingReasonCodes: [...reasonCodes] } : {}),
    ...(selectionReason ? { selectionReason } : {}),
    targetLevel: level
  }
  return problem
}

function generateScopedProblem(profile, selection, options) {
  const { level, startDecision } = sampleTrainingDecision(profile, selection, options)
  if (selection.domain.id === getDefaultDomainId()) {
    const evidenceSkill = chooseHiddenDecimalEvidence({
      skill: selection.skill,
      level,
      forcedLevel: options.forcedLevel,
      decimalFloor: getLowestUnmasteredLevel(profile, 'positions_decimal', 6)
    })
    if (evidenceSkill) {
      const problem = generateFromDomain(selection.domain, selection.skill, level, { ...options, evidenceSkill })
      return attachTrainingDecision(problem, selection, level, options, startDecision)
    }

    const problem = generateFromLegacySelector(profile, {
      ...options,
      allowedTypes: [selection.skill],
      forcedType: selection.skill,
      forcedLevel: level
    }, { domain: selection.domain.id, skill: selection.skill, level })
    return attachTrainingDecision(problem, selection, level, options, startDecision)
  }

  const problem = generateFromDomain(selection.domain, selection.skill, level, options)
  return attachTrainingDecision(problem, selection, level, options, startDecision)
}

export function selectNextProblemForProfile(profile, options = {}) {
  const scoped = resolveScopedSelection(profile, options)
  if (scoped) return generateScopedProblem(profile, scoped, options)

  return generateFromLegacySelector(profile, options)
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
