/**
 * Difficulty Adapter - Justerar svårighetsgrad baserat på prestation
 */

import { generateByDifficultyWithOptions, generateMultiplicationTableDrillProblem } from './problemGenerator'
import { getRecentSuccessRate, getConsecutiveErrors, getCurrentStreak } from './studentProfile'
import { inferOperationFromProblemType } from './mathUtils'
import {
  PROGRESSION_MODE_CHALLENGE,
  PROGRESSION_MODE_STEADY,
  normalizeProgressionMode
} from './progressionModes'

const DAY_MS = 24 * 60 * 60 * 1000
const ADVANCE_OFFER_COOLDOWN_MS = 20 * 60 * 1000
const KNOWN_OPERATION_TYPES = new Set(['addition', 'subtraction', 'multiplication', 'division'])
const BUCKET_CONFIG = {
  [PROGRESSION_MODE_CHALLENGE]: [
    { name: 'very_easy', offset: -2, weight: 0.05 },
    { name: 'easy', offset: -1, weight: 0.25 },
    { name: 'core', offset: 0, weight: 0.5 },
    { name: 'hard', offset: 1, weight: 0.15 },
    { name: 'challenge', offset: 2, weight: 0.05 }
  ],
  [PROGRESSION_MODE_STEADY]: [
    { name: 'very_easy', offset: -2, weight: 0.1 },
    { name: 'easy', offset: -1, weight: 0.35 },
    { name: 'core', offset: 0, weight: 0.45 },
    { name: 'hard', offset: 1, weight: 0.08 },
    { name: 'challenge', offset: 2, weight: 0.02 }
  ]
}

const ADJUST_CONFIG = {
  [PROGRESSION_MODE_CHALLENGE]: {
    upStrong: 0.35,
    upStreak: 0.2,
    upNormal: 0.1,
    upLowLevel: 0.05,
    comebackBonus: 0.15,
    downHard: 0.5,
    downMid: 0.25,
    downSoft: 0.15,
    speedBonus: 0.06
  },
  [PROGRESSION_MODE_STEADY]: {
    upStrong: 0.22,
    upStreak: 0.12,
    upNormal: 0.06,
    upLowLevel: 0.03,
    comebackBonus: 0.08,
    downHard: 0.35,
    downMid: 0.18,
    downSoft: 0.1,
    speedBonus: 0.03
  }
}

/**
 * Justera svårighetsgrad efter ett svar
 */
export function adjustDifficulty(profile, wasCorrect, options = {}) {
  ensureDifficultyMeta(profile)
  const recentSuccess = getRecentSuccessRate(profile, 5)
  const progressionMode = normalizeProgressionMode(options.progressionMode)
  const config = ADJUST_CONFIG[progressionMode] || ADJUST_CONFIG[PROGRESSION_MODE_CHALLENGE]

  if (wasCorrect) {
    // Rätt svar: mjukare ökning, även små steg för att undvika "fastna"
    const streak = getCurrentStreak(profile)

    // Stabilt starkt → öka tydligt men inte för snabbt
    if (streak >= 3 && recentSuccess >= 0.9) {
      profile.currentDifficulty += config.upStrong
    }
    // 2 rätt i rad → öka lite
    else if (streak >= 2) {
      profile.currentDifficulty += config.upStreak
    }
    // Enstaka rätt ska också kunna ge utveckling över tid
    else if (recentSuccess >= 0.55) {
      profile.currentDifficulty += config.upNormal
    }
    // Extra försiktig progression på låg nivå
    else if (profile.currentDifficulty <= 2) {
      profile.currentDifficulty += config.upLowLevel
    }

    // Har eleven tidigare varit högre upp? Hjälp snabbare tillbaka.
    const belowPeak = profile.currentDifficulty < profile.highestDifficulty - 0.3
    if (belowPeak && streak >= 2 && recentSuccess >= 0.7) {
      profile.currentDifficulty += config.comebackBonus
    }

    // Snabba korrekta svar kan ge liten bonus, men långsamhet straffas inte.
    if (isFastCorrectAnswer(options)) {
      profile.currentDifficulty += config.speedBonus
    }
  } else {
    if (options.errorCategory === 'inattention') {
      const tinyPenalty = progressionMode === PROGRESSION_MODE_STEADY ? 0.02 : 0.03
      profile.currentDifficulty -= tinyPenalty
    } else {
    // Fel svar: mindre hårda sänkningar för att minska bottenlåsning
    const errors = getConsecutiveErrors(profile)

    // Tydlig kamp → sänk, men inte drastiskt
    if (errors >= 3 && recentSuccess < 0.5) {
      profile.currentDifficulty -= config.downHard
    }
    // 2 fel i rad → minska
    else if (errors >= 2) {
      profile.currentDifficulty -= config.downMid
    }
    // Låg trend utan streak-fel → liten nedjustering
    else if (recentSuccess < 0.55) {
      profile.currentDifficulty -= config.downSoft
    }
    }
  }

  // Clamp mellan 1 och 12 (våra nivåer)
  profile.currentDifficulty = Math.max(1, Math.min(12, profile.currentDifficulty))
  profile.highestDifficulty = Math.max(profile.highestDifficulty, profile.currentDifficulty)
  updateSkillStateAfterAnswer(profile)

  return profile.currentDifficulty
}

/**
 * Välj nästa problem baserat på profil
 */
export function selectNextProblem(profile, options = {}) {
  ensureDifficultyMeta(profile)
  const recentSuccess = getRecentSuccessRate(profile, 5)
  const errors = getConsecutiveErrors(profile)
  const progressionMode = normalizeProgressionMode(options.progressionMode)
  const roundedDifficulty = clampLevelToRange(Math.round(profile.currentDifficulty), options.levelRange)
  const tableSet = normalizeTableSet(options.tableSet)
  const isTableDrill = tableSet.length > 0
  const preferredType = isTableDrill
    ? 'multiplication'
    : chooseProblemType(profile, recentSuccess, errors, progressionMode)
  const warmupLevel = getWarmupLevel(profile, roundedDifficulty)
  const allowedTypes = isTableDrill
    ? ['multiplication']
    : normalizeAllowedTypes(options.allowedTypes)
  const assignmentType = allowedTypes.length === 1 ? allowedTypes[0] : null

  // Sessionstyrd warmup (t.ex. vid fokuserat räknesättsläge)
  if (Number.isFinite(options.forcedLevel)) {
    const forcedLevel = clampLevelToRange(Math.round(options.forcedLevel), options.levelRange)
    const forcedType = options.forcedType || assignmentType || preferredType
    const problem = isTableDrill
      ? generateMultiplicationTableDrillProblem(tableSet, { level: forcedLevel })
      : generateByDifficultyWithOptions(forcedLevel, {
        preferredType: forcedType,
        allowedTypes
      })
    return annotateSelectedProblem(profile, problem, {
      reason: options.forceReason || 'session_warmup',
      bucket: options.forceBucket || 'easy',
      targetLevel: forcedLevel,
      progressionMode
    })
  }

  // Efter frånvaro: börja lite enklare för att nå 80/20-zonen snabbare.
  if (warmupLevel !== null) {
    const problem = isTableDrill
      ? generateMultiplicationTableDrillProblem(tableSet, { level: warmupLevel })
      : generateByDifficultyWithOptions(warmupLevel, {
        preferredType: assignmentType || 'addition',
        allowedTypes
      })
    return annotateSelectedProblem(profile, problem, {
      reason: 'warmup_after_break',
      bucket: 'easy',
      targetLevel: warmupLevel,
      progressionMode
    })
  }

  // Om 3+ fel i rad → ge lättare problem ("easy win")
  if (errors >= 3) {
    const easyLevel = clampLevelToRange(Math.max(1, roundedDifficulty - 1), options.levelRange)
    const problem = isTableDrill
      ? generateMultiplicationTableDrillProblem(tableSet, { level: easyLevel })
      : generateByDifficultyWithOptions(easyLevel, {
        preferredType: assignmentType || 'addition',
        allowedTypes
      })
    return annotateSelectedProblem(profile, problem, {
      reason: 'recovery_easy',
      bucket: 'easy',
      targetLevel: easyLevel,
      progressionMode
    })
  }

  const successPushThreshold = progressionMode === PROGRESSION_MODE_STEADY ? 0.96 : 0.92
  const successPushMinCount = progressionMode === PROGRESSION_MODE_STEADY ? 10 : 6

  // Om för lätt → öka
  if (recentSuccess > successPushThreshold && profile.recentProblems.length >= successPushMinCount) {
    const harderLevel = clampLevelToRange(Math.min(12, roundedDifficulty + 1), options.levelRange)
    const problem = isTableDrill
      ? generateMultiplicationTableDrillProblem(tableSet, { level: harderLevel })
      : generateByDifficultyWithOptions(harderLevel, { preferredType, allowedTypes })
    return annotateSelectedProblem(profile, problem, {
      reason: 'high_success_push',
      bucket: 'hard',
      targetLevel: harderLevel,
      progressionMode
    })
  }

  const reliefThreshold = progressionMode === PROGRESSION_MODE_STEADY ? 0.52 : 0.55
  const reliefMinCount = progressionMode === PROGRESSION_MODE_STEADY ? 8 : 6

  // Om för svårt → minska
  if (recentSuccess < reliefThreshold && profile.recentProblems.length >= reliefMinCount) {
    const easierLevel = clampLevelToRange(Math.max(1, roundedDifficulty - 1), options.levelRange)
    const problem = isTableDrill
      ? generateMultiplicationTableDrillProblem(tableSet, { level: easierLevel })
      : generateByDifficultyWithOptions(easierLevel, {
        preferredType: assignmentType || 'addition',
        allowedTypes
      })
    return annotateSelectedProblem(profile, problem, {
      reason: 'low_success_relief',
      bucket: 'easy',
      targetLevel: easierLevel,
      progressionMode
    })
  }

  // Hjälp elever att komma loss från nivå 1 med försiktig utmaning
  if (roundedDifficulty === 1 && recentSuccess >= 0.6 && profile.recentProblems.length >= 8) {
    const bootstrapChance = progressionMode === PROGRESSION_MODE_STEADY ? 0.15 : 0.3
    if (Math.random() < bootstrapChance) {
      const target = clampLevelToRange(2, options.levelRange)
      const problem = isTableDrill
        ? generateMultiplicationTableDrillProblem(tableSet, { level: target })
        : generateByDifficultyWithOptions(target, {
          preferredType: assignmentType || 'addition',
          allowedTypes
        })
      return annotateSelectedProblem(profile, problem, {
        reason: 'bootstrap_from_level1',
        bucket: 'hard',
        targetLevel: target,
        progressionMode
      })
    }
  }

  // Normal: viktad svårighetsmix runt centrum (normalfördelnings-liknande)
  const bucket = selectDifficultyBucket(profile, recentSuccess, errors, progressionMode)
  const targetLevel = clampLevelToRange(
    roundedDifficulty + getBucketOffset(bucket),
    options.levelRange
  )
  const problem = isTableDrill
    ? generateMultiplicationTableDrillProblem(tableSet, { level: targetLevel })
    : generateByDifficultyWithOptions(targetLevel, { preferredType, allowedTypes })
  return annotateSelectedProblem(profile, problem, {
    reason: 'weighted_mix',
    bucket,
    targetLevel,
    progressionMode
  })
}

export function shouldOfferSteadyAdvance(profile, options = {}) {
  ensureDifficultyMeta(profile)
  const progressionMode = normalizeProgressionMode(options.progressionMode)
  if (progressionMode !== PROGRESSION_MODE_STEADY) return null

  const roundedDifficulty = Math.max(1, Math.min(12, Math.round(profile.currentDifficulty || 1)))
  if (roundedDifficulty >= 12) return null

  const operation = resolveOfferOperation(options)
  if (!operation) return null

  const recent = profile.recentProblems
    .filter(problem => inferOperationFromProblemType(problem.problemType, {
      fallback: 'addition',
      allowUnknownPrefix: false
    }) === operation)
    .slice(-20)
  if (recent.length < 8) return null

  const currentLevelItems = recent.filter(problem => {
    const level = Number(problem?.difficulty?.conceptual_level || 0)
    return Math.round(level) === roundedDifficulty
  })
  const masteryItems = currentLevelItems.filter(problem => problem.errorCategory !== 'inattention')
  if (masteryItems.length < 6) return null

  const successRate = masteryItems.filter(problem => problem.correct).length / masteryItems.length
  const reasonableRate = masteryItems.filter(problem => problem.isReasonable).length / masteryItems.length
  if (successRate < 0.85 || reasonableRate < 0.7) return null

  const lastOffer = profile.adaptive.lastAdvanceOffer
  if (
    lastOffer
    && lastOffer.operation === operation
    && Number(lastOffer.fromLevel) === roundedDifficulty
    && Date.now() - Number(lastOffer.timestamp || 0) < ADVANCE_OFFER_COOLDOWN_MS
  ) {
    return null
  }

  return {
    operation,
    fromLevel: roundedDifficulty,
    nextLevel: Math.min(12, roundedDifficulty + 1),
    successRate,
    sampleSize: masteryItems.length
  }
}

export function recordSteadyAdvanceDecision(profile, offer, accepted) {
  ensureDifficultyMeta(profile)
  if (!offer || typeof offer !== 'object') return

  profile.adaptive.lastAdvanceOffer = {
    operation: offer.operation,
    fromLevel: offer.fromLevel,
    nextLevel: offer.nextLevel,
    accepted: Boolean(accepted),
    timestamp: Date.now()
  }
}

function ensureDifficultyMeta(profile) {
  if (typeof profile.highestDifficulty !== 'number' || Number.isNaN(profile.highestDifficulty)) {
    profile.highestDifficulty = profile.currentDifficulty || 1
  }
  if (!profile.adaptive || typeof profile.adaptive !== 'object') {
    profile.adaptive = {
      skillStates: {},
      recentSelections: []
    }
  }
  if (!profile.adaptive.skillStates || typeof profile.adaptive.skillStates !== 'object') {
    profile.adaptive.skillStates = {}
  }
  if (!Array.isArray(profile.adaptive.recentSelections)) {
    profile.adaptive.recentSelections = []
  }
}

function getWarmupLevel(profile, roundedDifficulty) {
  const lastTs = profile.recentProblems[profile.recentProblems.length - 1]?.timestamp
  if (!lastTs) return null

  const daysAway = (Date.now() - lastTs) / DAY_MS
  if (daysAway < 1) return null

  const warmupProblemsCompletedToday = getProblemsCompletedToday(profile)
  const warmupLength = Math.min(4, Math.max(2, Math.ceil(daysAway)))
  if (warmupProblemsCompletedToday >= warmupLength) return null

  const levelDrop = daysAway >= 7 ? 2 : daysAway >= 3 ? 2 : 1
  const baseWarmup = Math.max(1, roundedDifficulty - levelDrop)

  // 70/30: mest lättare för självförtroende, lite normal utmaning.
  if (Math.random() < 0.7) return baseWarmup
  return Math.max(1, baseWarmup + 1)
}

function getProblemsCompletedToday(profile) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return profile.recentProblems.filter(p => p.timestamp >= startOfToday).length
}

/**
 * Subtraktion/multiplikation/division introduceras stegvis:
 * - endast efter viss stabilitet
 * - lägre sannolikhet för kämpande elev
 */
function chooseProblemType(profile, recentSuccess, errors, progressionMode) {
  const attempts = profile.recentProblems.length
  const difficulty = profile.currentDifficulty

  // Skydda kämpande elever: håll dig till addition tills grunden sitter
  if (errors >= 2 || recentSuccess < 0.65) return 'addition'
  if (attempts < 10 || difficulty < 3.5) return 'addition'

  // Stegvis typmix:
  // - subtraktion kommer före multiplikation
  const options = [{
    type: 'addition',
    weight: progressionMode === PROGRESSION_MODE_STEADY ? 0.72 : 0.6
  }]

  if (difficulty >= 4 && attempts >= 12) {
    let subWeight = 0.25
    if (difficulty >= 7) subWeight = 0.3
    if (recentSuccess >= 0.85) subWeight += 0.05
    options.push({ type: 'subtraction', weight: subWeight })
    options[0].weight -= 0.15
  }

  if (difficulty >= 5 && attempts >= 16) {
    let mulWeight = 0.15
    if (difficulty >= 8) mulWeight = 0.2
    if (recentSuccess >= 0.85) mulWeight += 0.05
    options.push({ type: 'multiplication', weight: mulWeight })
    options[0].weight -= 0.1
  }

  if (difficulty >= 7 && attempts >= 22) {
    let divWeight = 0.1
    if (difficulty >= 10) divWeight = 0.14
    if (recentSuccess >= 0.88) divWeight += 0.04
    options.push({ type: 'division', weight: divWeight })
    options[0].weight -= 0.08
  }

  const normalized = normalizeWeights(options)
  const rand = Math.random()
  let acc = 0
  for (const item of normalized) {
    acc += item.weight
    if (rand <= acc) return item.type
  }
  return normalized[0].type
}

function normalizeAllowedTypes(allowedTypes) {
  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) return []
  const unique = []
  for (const type of allowedTypes) {
    const normalized = String(type || '').trim()
    if (!KNOWN_OPERATION_TYPES.has(normalized)) continue
    if (!unique.includes(normalized)) unique.push(normalized)
  }
  return unique
}

function normalizeTableSet(tableSet) {
  if (!Array.isArray(tableSet) || tableSet.length === 0) return []
  const unique = new Set()
  for (const value of tableSet) {
    const n = Number(value)
    if (Number.isInteger(n) && n >= 2 && n <= 12) {
      unique.add(n)
    }
  }
  return Array.from(unique).sort((a, b) => a - b)
}

function clampLevelToRange(level, levelRange) {
  if (!Array.isArray(levelRange) || levelRange.length !== 2) return level
  const minLevel = Math.max(1, Math.min(12, Number(levelRange[0]) || 1))
  const maxLevel = Math.max(minLevel, Math.min(12, Number(levelRange[1]) || 12))
  return Math.max(minLevel, Math.min(maxLevel, level))
}

function normalizeWeights(items) {
  const cleaned = items.map(i => ({ ...i, weight: Math.max(0.05, i.weight) }))
  const total = cleaned.reduce((sum, i) => sum + i.weight, 0)
  return cleaned.map(i => ({ ...i, weight: i.weight / total }))
}

function selectDifficultyBucket(profile, recentSuccess, errors, progressionMode) {
  const baseConfig = BUCKET_CONFIG[progressionMode] || BUCKET_CONFIG[PROGRESSION_MODE_CHALLENGE]
  let adjusted = baseConfig.map(item => ({ ...item }))

  if (errors >= 2 || recentSuccess < 0.7) {
    adjusted = adjusted.map(item => {
      if (item.name === 'very_easy') return { ...item, weight: item.weight * 1.7 }
      if (item.name === 'easy') return { ...item, weight: item.weight * 1.5 }
      if (item.name === 'hard') return { ...item, weight: item.weight * 0.65 }
      if (item.name === 'challenge') return { ...item, weight: item.weight * 0.4 }
      return item
    })
  } else if (recentSuccess > 0.86) {
    adjusted = adjusted.map(item => {
      if (item.name === 'hard') return { ...item, weight: item.weight * 1.35 }
      if (item.name === 'challenge') return { ...item, weight: item.weight * 1.45 }
      if (item.name === 'very_easy') return { ...item, weight: item.weight * 0.8 }
      return item
    })
  }

  const normalized = normalizeWeights(adjusted)
  const rand = Math.random()
  let acc = 0
  for (const item of normalized) {
    acc += item.weight
    if (rand <= acc) return item.name
  }
  return 'core'
}

function getBucketOffset(bucket) {
  const flat = [
    ...BUCKET_CONFIG[PROGRESSION_MODE_CHALLENGE],
    ...BUCKET_CONFIG[PROGRESSION_MODE_STEADY]
  ]
  const found = flat.find(item => item.name === bucket)
  return found ? found.offset : 0
}

function annotateSelectedProblem(profile, problem, details) {
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

function updateSkillStateAfterAnswer(profile) {
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

/**
 * Avgör om eleven behöver paus
 */
export function shouldSuggestBreak(_profile, sessionProblemCount, sessionRecentCorrectness = [], options = {}) {
  const questionThreshold = Number.isFinite(Number(options.questionThreshold))
    ? Number(options.questionThreshold)
    : 15
  const recentWindow = Number.isFinite(Number(options.recentWindow))
    ? Math.max(1, Number(options.recentWindow))
    : 10
  const errorThreshold = Number.isFinite(Number(options.errorThreshold))
    ? Math.max(1, Number(options.errorThreshold))
    : 5

  // Efter N problem i aktuell policy
  if (sessionProblemCount >= questionThreshold) return true

  // Om många fel i senaste fönster i aktuell session
  if (sessionRecentCorrectness.length >= recentWindow) {
    const lastWindow = sessionRecentCorrectness.slice(-recentWindow)
    const errors = lastWindow.filter(isCorrect => !isCorrect).length
    if (errors >= errorThreshold) return true
  }

  return false
}

function isFastCorrectAnswer(options) {
  const timeSpent = Number(options.timeSpent)
  if (!Number.isFinite(timeSpent) || timeSpent <= 0) return false
  const estimated = Number(options.problem?.metadata?.estimated_time)
  if (!Number.isFinite(estimated) || estimated <= 0) return timeSpent <= 12
  return timeSpent <= estimated * 0.75
}

function resolveOfferOperation(options) {
  if (typeof options.operation === 'string' && KNOWN_OPERATION_TYPES.has(options.operation)) {
    return options.operation
  }
  if (Array.isArray(options.allowedTypes) && options.allowedTypes.length === 1) {
    const only = String(options.allowedTypes[0] || '')
    if (KNOWN_OPERATION_TYPES.has(only)) return only
  }
  return null
}
