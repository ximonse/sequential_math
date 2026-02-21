/**
 * Difficulty Adapter - Justerar svårighetsgrad baserat på prestation
 */

import { generateByDifficultyWithOptions, generateMultiplicationTableDrillProblem } from './problemGenerator'
import { getRecentSuccessRate, getConsecutiveErrors, getCurrentStreak } from './studentProfile'
import { inferOperationFromProblemType } from './mathUtils'
import { filterNcmProblems, generateNcmProblemFromFilter } from './ncmProblemBank'
import {
  PROGRESSION_MODE_CHALLENGE,
  PROGRESSION_MODE_STEADY,
  normalizeProgressionMode
} from './progressionModes'

const DAY_MS = 24 * 60 * 60 * 1000
const ADVANCE_OFFER_COOLDOWN_MS = 20 * 60 * 1000
const NCM_ROTATION_MAX_SIGNATURES = 24
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

  let delta = 0
  if (wasCorrect) {
    const streak = getCurrentStreak(profile)

    if (streak >= 3 && recentSuccess >= 0.9) {
      delta = config.upStrong
    } else if (streak >= 2) {
      delta = config.upStreak
    } else if (recentSuccess >= 0.55) {
      delta = config.upNormal
    } else if (profile.currentDifficulty <= 2) {
      delta = config.upLowLevel
    }

    const belowPeak = profile.currentDifficulty < profile.highestDifficulty - 0.3
    if (belowPeak && streak >= 2 && recentSuccess >= 0.7) {
      delta += config.comebackBonus
    }

    if (isFastCorrectAnswer(options)) {
      delta += config.speedBonus
    }
  } else {
    if (options.errorCategory === 'inattention') {
      delta = -(progressionMode === PROGRESSION_MODE_STEADY ? 0.02 : 0.03)
    } else {
      const errors = getConsecutiveErrors(profile)

      if (errors >= 3 && recentSuccess < 0.5) {
        delta = -config.downHard
      } else if (errors >= 2) {
        delta = -config.downMid
      } else if (recentSuccess < 0.55) {
        delta = -config.downSoft
      }
    }
  }

  // Per-operation ability: full delta
  const operation = inferCurrentOperation(profile)
  if (operation) {
    const currentAbility = getOperationAbility(profile, operation)
    setOperationAbility(profile, operation, currentAbility + delta)
  }

  // Global difficulty: reducerad delta (50%) — styr främst operation-introduktion
  profile.currentDifficulty += delta * 0.5
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
  const globalRoundedDifficulty = clampLevelToRange(Math.round(profile.currentDifficulty), options.levelRange)
  const ncmFilter = normalizeNcmFilter(options.ncmFilter)

  if (ncmFilter) {
    const ncmCandidates = filterNcmProblems(ncmFilter)
    if (ncmCandidates.length === 0) {
      throw new Error('NCM filter did not match any available problems')
    }

    const preferredFromSession = String(options.ncmPreferredSkillTag || '').trim()
    const preferredSkillTag = preferredFromSession || pickNextNcmSkillTag(profile, ncmFilter, ncmCandidates)
    const recentNcmSkills = getRecentNcmSkillTags(profile, 6)
    const problem = generateNcmProblemFromFilter(ncmFilter, {
      levelHint: globalRoundedDifficulty,
      preferredSkillTag,
      excludeSkillTags: recentNcmSkills
    })
    if (!problem) {
      throw new Error('NCM filter did not match any available problems')
    }
    return annotateSelectedProblem(profile, problem, {
      reason: 'ncm_assignment',
      bucket: 'core',
      targetLevel: Number(problem?.difficulty?.conceptual_level || globalRoundedDifficulty),
      progressionMode
    })
  }

  const tableSet = normalizeTableSet(options.tableSet)
  const isTableDrill = tableSet.length > 0
  const preferredType = isTableDrill
    ? 'multiplication'
    : chooseProblemType(profile, recentSuccess, errors, progressionMode)

  const allowedTypes = isTableDrill
    ? ['multiplication']
    : normalizeAllowedTypes(options.allowedTypes)
  const assignmentType = allowedTypes.length === 1 ? allowedTypes[0] : null

  // Per-operation ability: använd tilldelad typ om den finns, annars vald typ
  const effectiveType = assignmentType || preferredType
  const operationAbility = getOperationAbility(profile, effectiveType)
  const roundedDifficulty = clampLevelToRange(Math.round(operationAbility), options.levelRange)
  const warmupLevel = getWarmupLevel(profile, roundedDifficulty, effectiveType)

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

  const operation = resolveOfferOperation(options)
  if (!operation) return null

  const roundedDifficulty = Math.max(1, Math.min(12, Math.round(getOperationAbility(profile, operation))))
  if (roundedDifficulty >= 12) return null

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
      division: Math.max(3, global - 4)
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
    .filter(p => inferOperationFromProblemType(p.problemType) === operation)
    .slice(-count)
  if (recent.length === 0) return 0.5
  return recent.filter(p => p.correct).length / recent.length
}

export function getConsecutiveOperationErrors(profile, operation) {
  let count = 0
  for (let i = profile.recentProblems.length - 1; i >= 0; i--) {
    const p = profile.recentProblems[i]
    if (inferOperationFromProblemType(p.problemType) !== operation) continue
    if (!p.correct) count++
    else break
  }
  return count
}

function inferCurrentOperation(profile) {
  const latest = profile.recentProblems[profile.recentProblems.length - 1]
  if (!latest) return null
  const op = inferOperationFromProblemType(latest.problemType)
  return KNOWN_OPERATION_TYPES.has(op) ? op : null
}

function getWarmupLevel(profile, roundedDifficulty, operation) {
  // Kolla senaste problem för detta räknesätt, inte generellt
  const operationProblems = operation
    ? profile.recentProblems.filter(
      p => inferOperationFromProblemType(p.problemType) === operation
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

  // 70/30: mest lättare för självförtroende, lite normal utmaning.
  if (Math.random() < 0.7) return baseWarmup
  return Math.max(1, baseWarmup + 1)
}

function getProblemsCompletedToday(profile) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return profile.recentProblems.filter(p => p.timestamp >= startOfToday).length
}

function getOperationProblemsCompletedToday(profile, operation) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return profile.recentProblems.filter(
    p => p.timestamp >= startOfToday && inferOperationFromProblemType(p.problemType) === operation
  ).length
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

function normalizeNcmFilter(raw) {
  if (!raw || typeof raw !== 'object') return null

  const codes = Array.isArray(raw.codes)
    ? raw.codes
      .map(item => String(item || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim())
      .filter(Boolean)
    : []
  const abilityTags = Array.isArray(raw.abilityTags)
    ? raw.abilityTags
      .map(item => String(item || '').trim())
      .filter(Boolean)
    : []

  if (codes.length === 0 && abilityTags.length === 0) return null

  return {
    codes: Array.from(new Set(codes)),
    abilityTags: Array.from(new Set(abilityTags))
  }
}

function buildNcmFilterSignature(filter) {
  const codes = Array.isArray(filter?.codes) ? [...filter.codes].sort() : []
  const abilityTags = Array.isArray(filter?.abilityTags) ? [...filter.abilityTags].sort() : []
  return `codes:${codes.join(',')}|abilities:${abilityTags.join(',')}`
}

function pickNextNcmSkillTag(profile, filter, candidates) {
  const signature = buildNcmFilterSignature(filter)
  const allSkillTags = Array.from(new Set(
    (Array.isArray(candidates) ? candidates : [])
      .map(item => String(item?.skillTag || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'sv'))
  if (allSkillTags.length === 0) return ''

  const store = profile.adaptive.ncmRotation
  const current = store[signature]
  let bucket = isValidNcmRotationBucket(current, allSkillTags)
    ? current
    : {
      skillTags: allSkillTags,
      queue: [],
      lastSkillTag: '',
      updatedAt: 0
    }

  if (!Array.isArray(bucket.queue) || bucket.queue.length === 0) {
    bucket.queue = shuffleStrings(allSkillTags)
    if (bucket.queue.length > 1 && bucket.lastSkillTag && bucket.queue[0] === bucket.lastSkillTag) {
      const replacementIndex = bucket.queue.findIndex(item => item !== bucket.lastSkillTag)
      if (replacementIndex > 0) {
        const first = bucket.queue[0]
        bucket.queue[0] = bucket.queue[replacementIndex]
        bucket.queue[replacementIndex] = first
      }
    }
  }

  const nextSkillTag = String(bucket.queue.shift() || '').trim()
  if (nextSkillTag) {
    bucket.lastSkillTag = nextSkillTag
  }
  bucket.updatedAt = Date.now()
  bucket.skillTags = allSkillTags
  store[signature] = bucket
  pruneNcmRotationStore(store)
  return nextSkillTag
}

function isValidNcmRotationBucket(bucket, allSkillTags) {
  if (!bucket || typeof bucket !== 'object') return false
  if (!Array.isArray(bucket.skillTags)) return false
  if (bucket.skillTags.length !== allSkillTags.length) return false
  const existing = [...bucket.skillTags].sort((a, b) => a.localeCompare(b, 'sv'))
  for (let i = 0; i < allSkillTags.length; i += 1) {
    if (existing[i] !== allSkillTags[i]) return false
  }
  if (!Array.isArray(bucket.queue)) return false
  return true
}

function shuffleStrings(values) {
  const arr = [...values]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function pruneNcmRotationStore(store) {
  const entries = Object.entries(store || {})
  if (entries.length <= NCM_ROTATION_MAX_SIGNATURES) return

  entries.sort((a, b) => Number(a[1]?.updatedAt || 0) - Number(b[1]?.updatedAt || 0))
  const removeCount = entries.length - NCM_ROTATION_MAX_SIGNATURES
  for (let i = 0; i < removeCount; i += 1) {
    delete store[entries[i][0]]
  }
}

function getRecentNcmSkillTags(profile, count = 6) {
  const recent = Array.isArray(profile?.recentProblems) ? profile.recentProblems : []
  const skillTags = recent
    .slice(-Math.max(1, count * 2))
    .map(item => String(item?.skillTag || '').trim())
    .filter(tag => tag.startsWith('ncm_'))

  return Array.from(new Set(skillTags.slice(-count)))
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
