import { inferOperationFromProblemType } from './mathUtils'
import {
  PROGRESSION_MODE_CHALLENGE
} from './progressionModes'

const DAY_MS = 24 * 60 * 60 * 1000
const KNOWN_OPERATION_TYPES = new Set([
  'addition', 'subtraction', 'multiplication', 'division',
  'algebra_evaluate', 'algebra_simplify',
  'arithmetic_expressions', 'fractions', 'percentage'
])

export function ensureDifficultyMeta(profile) {
  if (typeof profile.highestDifficulty !== 'number' || Number.isNaN(profile.highestDifficulty)) {
    profile.highestDifficulty = profile.currentDifficulty || 1
  }
  if (!profile.adaptive || typeof profile.adaptive !== 'object') {
    profile.adaptive = {
      skillStates: {},
      recentSelections: [],
      ncmRotation: {}
    }
  }
  if (!profile.adaptive.skillStates || typeof profile.adaptive.skillStates !== 'object') {
    profile.adaptive.skillStates = {}
  }
  if (!Array.isArray(profile.adaptive.recentSelections)) {
    profile.adaptive.recentSelections = []
  }
  if (!profile.adaptive.ncmRotation || typeof profile.adaptive.ncmRotation !== 'object') {
    profile.adaptive.ncmRotation = {}
  }
  if (!profile.adaptive.operationAbilities || typeof profile.adaptive.operationAbilities !== 'object') {
    const global = profile.currentDifficulty || 1
    profile.adaptive.operationAbilities = {
      addition: global,
      subtraction: Math.max(1, global - 2),
      multiplication: Math.max(1, global - 3),
      division: Math.max(3, global - 4),
      algebra_evaluate: 1,
      algebra_simplify: 1,
      arithmetic_expressions: 1,
      fractions: 1,
      percentage: 1
    }
  } else {
    const abilities = profile.adaptive.operationAbilities
    const extras = ['algebra_evaluate', 'algebra_simplify', 'arithmetic_expressions', 'fractions', 'percentage']
    for (const op of extras) {
      if (typeof abilities[op] !== 'number') abilities[op] = 1
    }
  }
}

export function getOperationAbility(profile, operation) {
  ensureDifficultyMeta(profile)
  const abilities = profile.adaptive.operationAbilities
  if (abilities && typeof abilities[operation] === 'number' && Number.isFinite(abilities[operation])) {
    return abilities[operation]
  }
  return profile.currentDifficulty || 1
}

export function setOperationAbility(profile, operation, value) {
  ensureDifficultyMeta(profile)
  profile.adaptive.operationAbilities[operation] = Math.max(1, Math.min(12, value))
}

export function getRecentOperationSuccessRate(profile, operation, count = 5) {
  const recent = profile.recentProblems
    .filter(problem => inferOperationFromProblemType(problem.problemType) === operation)
    .slice(-count)
  if (recent.length === 0) return 0.5
  return recent.filter(problem => problem.correct).length / recent.length
}

export function getConsecutiveOperationErrors(profile, operation) {
  let count = 0
  for (let i = profile.recentProblems.length - 1; i >= 0; i -= 1) {
    const problem = profile.recentProblems[i]
    if (inferOperationFromProblemType(problem.problemType) !== operation) continue
    if (!problem.correct) count += 1
    else break
  }
  return count
}

export function inferCurrentOperation(profile) {
  const latest = profile.recentProblems[profile.recentProblems.length - 1]
  if (!latest) return null
  const operation = inferOperationFromProblemType(latest.problemType)
  return KNOWN_OPERATION_TYPES.has(operation) ? operation : null
}

export function getWarmupLevel(profile, roundedDifficulty, operation) {
  const operationProblems = operation
    ? profile.recentProblems.filter(
      problem => inferOperationFromProblemType(problem.problemType) === operation
    )
    : profile.recentProblems
  const lastTs = operationProblems[operationProblems.length - 1]?.timestamp
  if (!lastTs) return null

  const daysAway = (Date.now() - lastTs) / DAY_MS
  if (daysAway < 1) return null

  const todayOperationCount = operation
    ? getOperationProblemsCompletedToday(profile, operation)
    : getProblemsCompletedToday(profile)
  const warmupLength = Math.min(4, Math.max(2, Math.ceil(daysAway)))
  if (todayOperationCount >= warmupLength) return null

  const levelDrop = daysAway >= 7 ? 2 : daysAway >= 3 ? 2 : 1
  const baseWarmup = Math.max(1, roundedDifficulty - levelDrop)

  if (Math.random() < 0.7) return baseWarmup
  return Math.max(1, baseWarmup + 1)
}

export function annotateSelectedProblem(profile, problem, details) {
  const skillTag = problem.metadata?.skillTag || problem.template
  const skillState = getOrInitSkillState(profile, skillTag)

  problem.metadata = {
    ...(problem.metadata || {}),
    skillTag,
    selectionReason: details.reason,
    difficultyBucket: details.bucket,
    targetLevel: details.targetLevel,
    abilityBefore: skillState.ability,
    progressionMode: details.progressionMode || PROGRESSION_MODE_CHALLENGE
  }

  profile.adaptive.recentSelections.push({
    timestamp: Date.now(),
    skillTag,
    operation: problem.type,
    selectionReason: details.reason,
    difficultyBucket: details.bucket,
    targetLevel: details.targetLevel,
    abilityBefore: skillState.ability,
    progressionMode: details.progressionMode || PROGRESSION_MODE_CHALLENGE
  })
  if (profile.adaptive.recentSelections.length > 200) {
    profile.adaptive.recentSelections.shift()
  }

  return problem
}

export function updateSkillStateAfterAnswer(profile) {
  const latest = profile.recentProblems[profile.recentProblems.length - 1]
  if (!latest) return

  const skillTag = latest.skillTag || latest.problemType
  const state = getOrInitSkillState(profile, skillTag)
  const effectiveTime = Number.isFinite(Number(latest.speedTimeSec))
    ? Number(latest.speedTimeSec)
    : Number(latest.timeSpent)
  const wasFast = effectiveTime > 0 && effectiveTime < 18
  const isInattentionError = latest.errorCategory === 'inattention'

  let delta = 0
  if (isInattentionError && !latest.correct) {
    delta -= 0.03
  } else {
    if (latest.correct && latest.isReasonable) delta += 0.25
    if (latest.correct && !latest.isReasonable) delta += 0.12
    if (!latest.correct && latest.isReasonable) delta -= 0.1
    if (!latest.correct && !latest.isReasonable) delta -= 0.25
    if (latest.correct && wasFast) delta += 0.05
  }

  state.ability = Math.max(1, Math.min(12, state.ability + delta))
  state.attempts += 1
  if (latest.correct) state.correct += 1
  if (latest.isReasonable) state.reasonable += 1
  if (effectiveTime > 0) {
    state.avgTime = state.attempts === 1
      ? effectiveTime
      : ((state.avgTime * (state.attempts - 1)) + effectiveTime) / state.attempts
  }
  state.lastSeen = latest.timestamp

  latest.abilityAfter = state.ability
}

export function isFastCorrectAnswer(options) {
  const timeSpent = Number(options.timeSpent)
  if (!Number.isFinite(timeSpent) || timeSpent <= 0) return false
  const estimated = Number(options.problem?.metadata?.estimated_time)
  if (!Number.isFinite(estimated) || estimated <= 0) return timeSpent <= 12
  return timeSpent <= estimated * 0.75
}

export function resolveOfferOperation(options) {
  if (typeof options.operation === 'string' && KNOWN_OPERATION_TYPES.has(options.operation)) {
    return options.operation
  }
  if (Array.isArray(options.allowedTypes) && options.allowedTypes.length === 1) {
    const only = String(options.allowedTypes[0] || '')
    if (KNOWN_OPERATION_TYPES.has(only)) return only
  }
  return null
}

function getProblemsCompletedToday(profile) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return profile.recentProblems.filter(problem => problem.timestamp >= startOfToday).length
}

function getOperationProblemsCompletedToday(profile, operation) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return profile.recentProblems.filter(
    problem => problem.timestamp >= startOfToday && inferOperationFromProblemType(problem.problemType) === operation
  ).length
}

function getOrInitSkillState(profile, skillTag) {
  const existing = profile.adaptive.skillStates[skillTag]
  if (existing) return existing

  const state = {
    ability: profile.currentDifficulty || 1,
    attempts: 0,
    correct: 0,
    reasonable: 0,
    avgTime: 0,
    lastSeen: null
  }
  profile.adaptive.skillStates[skillTag] = state
  return state
}
