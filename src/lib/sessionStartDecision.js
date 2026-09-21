import { resolveProblemOperation } from './mathUtils'
import { PROGRESSION_MODE_STEADY } from './progressionModes'

export const SESSION_START_RULE_VERSION = 1
const DAY_MS = 24 * 60 * 60 * 1000

function clampLevel(value, levelRange = null) {
  const min = Array.isArray(levelRange) ? Number(levelRange[0]) : 1
  const max = Array.isArray(levelRange) ? Number(levelRange[1]) : 12
  return Math.max(min, Math.min(max, Math.round(Number(value) || min)))
}

function operationProblems(profile, operation) {
  const source = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  return source.filter(problem => (
    resolveProblemOperation(problem, { fallback: '', allowUnknownPrefix: false }) === operation
  ))
}

function cleanFrameId(value) {
  return String(value || '').trim().slice(0, 200)
}

export function buildFocusedSessionStartPlan({
  profile,
  operation,
  destinationLevel,
  levelRange = null,
  progressionMode = '',
  frameId = '',
  now = Date.now()
} = {}) {
  const skill = String(operation || '').trim()
  const destination = clampLevel(destinationLevel, levelRange)
  if (!profile || !skill) return null

  const history = operationProblems(profile, skill)
  const hasHistory = history.length > 0
  const steady = progressionMode === PROGRESSION_MODE_STEADY
  const stepCount = steady ? 4 : 3
  const startDrop = hasHistory ? (steady ? 3 : 1) : destination - 1
  const startLevel = clampLevel(destination - startDrop, levelRange)
  const decidedAt = Number(now)
  const normalizedFrameId = cleanFrameId(frameId)
  const purpose = hasHistory ? 'consolidate' : 'introduce'

  return {
    planId: `start:${normalizedFrameId || 'local'}:${skill}:${decidedAt}:v${SESSION_START_RULE_VERSION}`,
    ruleVersion: SESSION_START_RULE_VERSION,
    operation: skill,
    purpose,
    reasonCodes: hasHistory
      ? ['focused_session_start', 'ramp_to_current_need']
      : ['first_operation_session', 'introduce_from_foundation'],
    startLevel,
    destinationLevel: destination,
    stepCount,
    frameId: normalizedFrameId,
    evidenceObservationIds: history.length > 0
      ? [String(history[history.length - 1]?.observationId || history[history.length - 1]?.problemId || '')].filter(Boolean)
      : [],
    decidedAt
  }
}

export function getFocusedSessionStartDecision(plan, completedCount) {
  if (!plan || Number(completedCount) >= Number(plan.stepCount)) return null
  const stepNumber = Math.max(1, Number(completedCount || 0) + 1)
  const targetLevel = Math.min(
    Number(plan.destinationLevel),
    Number(plan.startLevel) + stepNumber - 1
  )

  return {
    decisionId: `${plan.planId}:step:${stepNumber}`,
    ruleVersion: Number(plan.ruleVersion),
    action: 'session_start',
    purpose: plan.purpose,
    reasonCodes: [...plan.reasonCodes],
    operation: plan.operation,
    targetLevel,
    destinationLevel: Number(plan.destinationLevel),
    stepNumber,
    stepCount: Number(plan.stepCount),
    frameId: plan.frameId,
    evidenceObservationIds: [...plan.evidenceObservationIds],
    decidedAt: Number(plan.decidedAt)
  }
}

export function buildAbsenceWarmupDecision({
  profile,
  operation,
  destinationLevel,
  levelRange = null,
  frameId = '',
  now = Date.now()
} = {}) {
  const skill = String(operation || '').trim()
  if (!profile || !skill) return null

  const currentTime = Number(now)
  const currentDate = new Date(currentTime)
  const todayStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  ).getTime()
  const history = operationProblems(profile, skill)
  const today = history.filter(problem => Number(problem.timestamp || 0) >= todayStart)
  const previous = history.filter(problem => Number(problem.timestamp || 0) < todayStart)
  const latestPrevious = previous[previous.length - 1]
  const latestTimestamp = Number(latestPrevious?.timestamp || 0)
  if (!latestTimestamp) return null

  const daysAway = (currentTime - latestTimestamp) / DAY_MS
  if (daysAway < 1) return null

  const stepCount = Math.min(4, Math.max(2, Math.ceil(daysAway)))
  if (today.length >= stepCount) return null

  const destination = clampLevel(destinationLevel, levelRange)
  const levelDrop = daysAway >= 3 ? 2 : 1
  const targetLevel = clampLevel(destination - levelDrop, levelRange)
  const stepNumber = today.length + 1
  const normalizedFrameId = cleanFrameId(frameId)

  return {
    decisionId: `start:absence:${normalizedFrameId || 'local'}:${skill}:${latestTimestamp}:step:${stepNumber}:v${SESSION_START_RULE_VERSION}`,
    ruleVersion: SESSION_START_RULE_VERSION,
    action: 'session_start',
    purpose: 'consolidate',
    reasonCodes: ['return_after_absence', daysAway >= 3 ? 'multi_day_level_relief' : 'one_day_level_relief'],
    operation: skill,
    targetLevel,
    destinationLevel: destination,
    stepNumber,
    stepCount,
    frameId: normalizedFrameId,
    evidenceObservationIds: [String(latestPrevious.observationId || latestPrevious.problemId || '')].filter(Boolean),
    decidedAt: currentTime
  }
}
