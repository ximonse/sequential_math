import { isMasteryEligible, readEvidenceClaim } from './evidenceContract'

export const CURRENT_NEED_RULE_VERSION = 1
export const RECOVERY_ENTER_ERROR_STREAK = 3
export const RECOVERY_EXIT_CORRECT_STREAK = 2
export const SUPPORT_AFTER_RECOVERY_OBSERVATIONS = 4
const MAX_CURRENT_NEED_HISTORY = 100
const PURPOSES = new Set(['consolidate', 'challenge', 'recover', 'support'])

function clampLevel(value, range) {
  const min = Array.isArray(range) ? Number(range[0]) : 1
  const max = Array.isArray(range) ? Number(range[1]) : 12
  return Math.max(min, Math.min(max, Math.round(Number(value) || min)))
}

function relevantObservations(profile, operation) {
  const source = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  return source.filter(item => isMasteryEligible(item) && readEvidenceClaim(item).skill === operation)
}

function trailingCount(observations, predicate) {
  let count = 0
  for (let index = observations.length - 1; index >= 0; index -= 1) {
    if (!predicate(observations[index])) break
    count += 1
  }
  return count
}

export function buildCurrentNeed({ profile, observation, trainingContext, masteryFloor, progressionDecision } = {}) {
  if (!profile || !isMasteryEligible(observation)) return null
  const claim = readEvidenceClaim(observation)
  const operation = String(claim.skill || '').trim()
  const observedLevel = Number(claim.level)
  if (!operation || !Number.isInteger(observedLevel)) return null

  const history = relevantObservations(profile, operation)
  const errorStreak = trailingCount(history, item => !item.correct)
  const correctStreak = trailingCount(history, item => item.correct && !item.isPartial)
  const previous = profile.adaptive?.currentNeeds?.[operation] || null
  const needHistory = Array.isArray(profile.adaptive?.currentNeedHistory)
    ? profile.adaptive.currentNeedHistory.filter(item => item?.operation === operation)
    : []
  const recoveryRun = trailingCount(
    needHistory,
    item => item?.purpose === 'recover' || item?.purpose === 'support'
  )
  const levelRange = trainingContext?.levelRange

  let purpose = 'consolidate'
  let targetLevel = clampLevel(masteryFloor || observedLevel, levelRange)
  let reasonCodes = ['mastery_floor']

  if (progressionDecision?.action === 'advance') {
    purpose = 'challenge'
    targetLevel = clampLevel(progressionDecision.nextLevel, levelRange)
    reasonCodes = ['mastery_achieved', 'next_level_available']
  } else if (previous?.purpose === 'recover' || previous?.purpose === 'support') {
    if (correctStreak >= RECOVERY_EXIT_CORRECT_STREAK) {
      reasonCodes = ['recovery_stabilized', 'return_to_mastery_floor']
    } else if (
      previous.purpose === 'support'
      || recoveryRun >= SUPPORT_AFTER_RECOVERY_OBSERVATIONS - 1
    ) {
      purpose = 'support'
      targetLevel = clampLevel(previous.targetLevel, levelRange)
      reasonCodes = ['recovery_not_yet_sufficient', 'teacher_signal_required']
    } else {
      purpose = 'recover'
      targetLevel = clampLevel(previous.targetLevel, levelRange)
      reasonCodes = ['recovery_in_progress', 'stability_not_yet_reestablished']
    }
  } else if (errorStreak >= RECOVERY_ENTER_ERROR_STREAK) {
    purpose = 'recover'
    targetLevel = clampLevel(observedLevel - 1, levelRange)
    reasonCodes = ['consecutive_errors', 'temporary_level_relief']
  }

  const evidenceObservationIds = purpose === 'support'
    ? history
      .filter(item => !item.correct)
      .slice(-6)
      .map(item => String(item.observationId || item.problemId || '').trim())
      .filter(Boolean)
    : [String(observation.observationId || observation.problemId || '')].filter(Boolean)

  const decidedAt = Number(observation.timestamp || Date.now())
  return {
    needId: `need:${String(observation.observationId || observation.problemId)}:v${CURRENT_NEED_RULE_VERSION}`,
    ruleVersion: CURRENT_NEED_RULE_VERSION,
    operation,
    purpose,
    targetLevel,
    reasonCodes,
    frameId: String(trainingContext?.frameId || '').slice(0, 200),
    trainingMode: String(trainingContext?.mode || ''),
    assignmentId: String(trainingContext?.assignmentId || '').slice(0, 100),
    evidenceObservationIds,
    decidedAt
  }
}

export function isValidCurrentNeed(value) {
  return Boolean(value
    && typeof value.needId === 'string' && value.needId.length > 0 && value.needId.length <= 250
    && Number.isInteger(Number(value.ruleVersion)) && Number(value.ruleVersion) >= 1
    && typeof value.operation === 'string' && value.operation.length > 0 && value.operation.length <= 100
    && PURPOSES.has(value.purpose)
    && Number.isInteger(Number(value.targetLevel)) && Number(value.targetLevel) >= 1 && Number(value.targetLevel) <= 12
    && Array.isArray(value.reasonCodes) && value.reasonCodes.length > 0 && value.reasonCodes.length <= 10
    && Number.isFinite(Number(value.decidedAt)) && Number(value.decidedAt) > 0)
}

export function recordCurrentNeed(profile, need) {
  if (!profile || !isValidCurrentNeed(need)) return false
  if (!profile.adaptive || typeof profile.adaptive !== 'object') profile.adaptive = {}
  if (!profile.adaptive.currentNeeds || typeof profile.adaptive.currentNeeds !== 'object') profile.adaptive.currentNeeds = {}
  if (!Array.isArray(profile.adaptive.currentNeedHistory)) profile.adaptive.currentNeedHistory = []
  if (profile.adaptive.currentNeedHistory.some(item => item?.needId === need.needId)) return false
  const stored = structuredClone(need)
  profile.adaptive.currentNeeds[need.operation] = stored
  profile.adaptive.currentNeedHistory.push(stored)
  profile.adaptive.currentNeedHistory = profile.adaptive.currentNeedHistory.slice(-MAX_CURRENT_NEED_HISTORY)
  return true
}

export function getCurrentNeed(profile, operation) {
  const need = profile?.adaptive?.currentNeeds?.[operation]
  return isValidCurrentNeed(need) ? need : null
}
