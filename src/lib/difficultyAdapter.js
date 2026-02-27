/**
 * Difficulty Adapter - Justerar svårighetsgrad baserat på prestation
 */

import { generateByDifficultyWithOptions, generateMultiplicationTableDrillProblem } from './problemGenerator'
import { getRecentSuccessRate, getConsecutiveErrors, getCurrentStreak, getLowestUnmasteredLevel } from './studentProfile'
import { inferOperationFromProblemType } from './mathUtils'
import { filterNcmProblems, generateNcmProblemFromFilter } from './ncmProblemBank'
import {
  PROGRESSION_MODE_CHALLENGE,
  PROGRESSION_MODE_STEADY,
  normalizeProgressionMode
} from './progressionModes'
import {
  annotateSelectedProblem,
  ensureDifficultyMeta,
  getConsecutiveOperationErrors,
  getOperationAbility,
  getRecentOperationSuccessRate,
  getWarmupLevel,
  inferCurrentOperation,
  isFastCorrectAnswer,
  resolveOfferOperation,
  setOperationAbility,
  updateSkillStateAfterAnswer
} from './difficultyAdapterProfileHelpers'
import {
  chooseProblemType,
  clampLevelToRange,
  getBucketOffset,
  getRecentNcmSkillTags,
  normalizeAllowedTypes,
  normalizeNcmFilter,
  normalizeTableSet,
  pickNextNcmSkillTag,
  selectDifficultyBucket
} from './difficultyAdapterSelectionHelpers'

const ADVANCE_OFFER_COOLDOWN_MS = 20 * 60 * 1000
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

  const operation = inferCurrentOperation(profile)
  if (operation) {
    const currentAbility = getOperationAbility(profile, operation)
    setOperationAbility(profile, operation, currentAbility + delta)
  }

  profile.currentDifficulty += delta * 0.5
  profile.currentDifficulty = Math.max(1, Math.min(12, profile.currentDifficulty))
  profile.highestDifficulty = Math.max(profile.highestDifficulty, profile.currentDifficulty)
  updateSkillStateAfterAnswer(profile)

  return profile.currentDifficulty
}

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

  const effectiveType = assignmentType || preferredType
  const operationAbility = getOperationAbility(profile, effectiveType)
  let roundedDifficulty = clampLevelToRange(Math.round(operationAbility), options.levelRange)

  // Mastery-styrd progression: träna på lägsta omastrade nivån
  if (!options.forcedLevel) {
    const floor = getLowestUnmasteredLevel(profile, effectiveType)
    roundedDifficulty = floor
  }

  if (effectiveType !== 'addition') {
    const opAttempts = profile.recentProblems.filter(
      problem => inferOperationFromProblemType(problem.problemType) === effectiveType
    ).length
    if (opAttempts < 3) roundedDifficulty = Math.min(roundedDifficulty, 1)
    else if (opAttempts < 6) roundedDifficulty = Math.min(roundedDifficulty, 2)
    else if (opAttempts < 12) roundedDifficulty = Math.min(roundedDifficulty, 3)
  }

  const warmupLevel = getWarmupLevel(profile, roundedDifficulty, effectiveType)

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

  if (sessionProblemCount >= questionThreshold) return true

  if (sessionRecentCorrectness.length >= recentWindow) {
    const lastWindow = sessionRecentCorrectness.slice(-recentWindow)
    const errors = lastWindow.filter(isCorrect => !isCorrect).length
    if (errors >= errorThreshold) return true
  }

  return false
}

export {
  getOperationAbility,
  setOperationAbility,
  getRecentOperationSuccessRate,
  getConsecutiveOperationErrors
}
