import { TRAINING_MODES } from './trainingContext.js'
import { getOperationMaxLevel } from './operations.js'

export const ADAPTATION_DECISION_RULE_VERSION = 1
export const MAX_ADAPTATION_DECISIONS = 100

export const ADAPTATION_ACTIONS = Object.freeze({
  ADVANCE: 'advance',
  COMPLETE_DOMAIN: 'complete_domain',
  HOLD_FRAME: 'hold_frame'
})

const KNOWN_ACTIONS = new Set(Object.values(ADAPTATION_ACTIONS))
const KNOWN_TRAINING_MODES = new Set(['', ...Object.values(TRAINING_MODES)])

function cleanObservationIds(values) {
  if (!Array.isArray(values)) return []
  return Array.from(new Set(values
    .map(value => String(value || '').trim())
    .filter(Boolean)))
    .slice(0, 50)
}

export function buildMasteryProgressionDecision({ mastery, trainingContext } = {}) {
  const operation = String(mastery?.operation || '').trim()
  const fromLevel = Number(mastery?.level)
  const decidedAt = Number(mastery?.achievedAt)
  if (!operation || !Number.isInteger(fromLevel) || fromLevel < 1 || fromLevel > 12) return null
  if (!Number.isFinite(decidedAt) || decidedAt <= 0) return null

  const trainingMode = String(trainingContext?.mode || '')
  const frameMax = Array.isArray(trainingContext?.levelRange)
    ? Number(trainingContext.levelRange[1])
    : 12
  const domainMax = getOperationMaxLevel(operation)
  const nextLevel = fromLevel < domainMax ? fromLevel + 1 : null

  let action = ADAPTATION_ACTIONS.ADVANCE
  let purpose = 'challenge'
  let reasonCodes = ['mastery_achieved', 'next_level_available']

  if (fromLevel >= domainMax) {
    action = ADAPTATION_ACTIONS.COMPLETE_DOMAIN
    purpose = 'consolidate'
    reasonCodes = ['mastery_achieved', 'domain_ceiling_reached']
  } else if (
    trainingMode === TRAINING_MODES.TEACHER_LOCKED
    || (trainingMode === TRAINING_MODES.TEACHER_ADAPTIVE && nextLevel > frameMax)
  ) {
    action = ADAPTATION_ACTIONS.HOLD_FRAME
    purpose = 'consolidate'
    reasonCodes = ['mastery_achieved', 'teacher_frame_boundary']
  }

  return {
    decisionId: `mastery:${operation}:${fromLevel}:${decidedAt}:v${ADAPTATION_DECISION_RULE_VERSION}`,
    ruleVersion: ADAPTATION_DECISION_RULE_VERSION,
    action,
    purpose,
    reasonCodes,
    operation,
    fromLevel,
    nextLevel: action === ADAPTATION_ACTIONS.ADVANCE ? nextLevel : null,
    frameId: String(trainingContext?.frameId || '').slice(0, 200),
    trainingMode,
    assignmentId: String(trainingContext?.assignmentId || '').slice(0, 100),
    evidenceObservationIds: cleanObservationIds(mastery?.evidenceObservationIds),
    decidedAt
  }
}

export function isValidAdaptationDecision(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (typeof value.decisionId !== 'string' || !value.decisionId || value.decisionId.length > 250) return false
  if (!Number.isInteger(Number(value.ruleVersion)) || Number(value.ruleVersion) < 1) return false
  if (!KNOWN_ACTIONS.has(value.action)) return false
  if (!['challenge', 'consolidate'].includes(value.purpose)) return false
  if (!Array.isArray(value.reasonCodes) || value.reasonCodes.length === 0 || value.reasonCodes.length > 10) return false
  if (value.reasonCodes.some(code => typeof code !== 'string' || !code || code.length > 100)) return false
  if (typeof value.operation !== 'string' || !value.operation || value.operation.length > 100) return false
  if (!Number.isInteger(Number(value.fromLevel)) || Number(value.fromLevel) < 1 || Number(value.fromLevel) > 12) return false
  if (value.nextLevel !== null && (!Number.isInteger(Number(value.nextLevel))
    || Number(value.nextLevel) < 1 || Number(value.nextLevel) > 12)) return false
  if (value.action === ADAPTATION_ACTIONS.ADVANCE && Number(value.nextLevel) !== Number(value.fromLevel) + 1) return false
  if (value.action !== ADAPTATION_ACTIONS.ADVANCE && value.nextLevel !== null) return false
  if (typeof value.frameId !== 'string' || value.frameId.length > 200) return false
  if (typeof value.trainingMode !== 'string' || !KNOWN_TRAINING_MODES.has(value.trainingMode)) return false
  if (typeof value.assignmentId !== 'string' || value.assignmentId.length > 100) return false
  if (!Array.isArray(value.evidenceObservationIds) || value.evidenceObservationIds.length > 50) return false
  if (value.evidenceObservationIds.some(id => typeof id !== 'string' || !id || id.length > 200)) return false
  return Number.isFinite(Number(value.decidedAt)) && Number(value.decidedAt) > 0
}

export function recordAdaptationDecision(profile, decision) {
  if (!profile || !isValidAdaptationDecision(decision)) return false
  if (!profile.adaptive || typeof profile.adaptive !== 'object') profile.adaptive = {}
  if (!Array.isArray(profile.adaptive.decisionHistory)) profile.adaptive.decisionHistory = []
  if (profile.adaptive.decisionHistory.some(item => item?.decisionId === decision.decisionId)) return false

  const stored = structuredClone(decision)
  profile.adaptive.decisionHistory.push(stored)
  profile.adaptive.decisionHistory = profile.adaptive.decisionHistory
    .sort((a, b) => Number(a.decidedAt || 0) - Number(b.decidedAt || 0))
    .slice(-MAX_ADAPTATION_DECISIONS)
  profile.adaptive.lastDecision = stored
  return true
}
