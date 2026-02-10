/**
 * Difficulty Adapter - Justerar svårighetsgrad baserat på prestation
 */

import { generateByDifficultyWithOptions } from './problemGenerator'
import { getRecentSuccessRate, getConsecutiveErrors, getCurrentStreak } from './studentProfile'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Justera svårighetsgrad efter ett svar
 */
export function adjustDifficulty(profile, wasCorrect) {
  ensureDifficultyMeta(profile)
  const recentSuccess = getRecentSuccessRate(profile, 5)

  if (wasCorrect) {
    // Rätt svar: mjukare ökning, även små steg för att undvika "fastna"
    const streak = getCurrentStreak(profile)

    // Stabilt starkt → öka tydligt men inte för snabbt
    if (streak >= 3 && recentSuccess >= 0.9) {
      profile.currentDifficulty += 0.35
    }
    // 2 rätt i rad → öka lite
    else if (streak >= 2) {
      profile.currentDifficulty += 0.2
    }
    // Enstaka rätt ska också kunna ge utveckling över tid
    else if (recentSuccess >= 0.55) {
      profile.currentDifficulty += 0.1
    }
    // Extra försiktig progression på låg nivå
    else if (profile.currentDifficulty <= 2) {
      profile.currentDifficulty += 0.05
    }

    // Har eleven tidigare varit högre upp? Hjälp snabbare tillbaka.
    const belowPeak = profile.currentDifficulty < profile.highestDifficulty - 0.3
    if (belowPeak && streak >= 2 && recentSuccess >= 0.7) {
      profile.currentDifficulty += 0.15
    }
  } else {
    // Fel svar: mindre hårda sänkningar för att minska bottenlåsning
    const errors = getConsecutiveErrors(profile)

    // Tydlig kamp → sänk, men inte drastiskt
    if (errors >= 3 && recentSuccess < 0.5) {
      profile.currentDifficulty -= 0.5
    }
    // 2 fel i rad → minska
    else if (errors >= 2) {
      profile.currentDifficulty -= 0.25
    }
    // Låg trend utan streak-fel → liten nedjustering
    else if (recentSuccess < 0.55) {
      profile.currentDifficulty -= 0.15
    }
  }

  // Clamp mellan 1 och 12 (våra nivåer)
  profile.currentDifficulty = Math.max(1, Math.min(12, profile.currentDifficulty))
  profile.highestDifficulty = Math.max(profile.highestDifficulty, profile.currentDifficulty)

  return profile.currentDifficulty
}

/**
 * Välj nästa problem baserat på profil
 */
export function selectNextProblem(profile, options = {}) {
  ensureDifficultyMeta(profile)
  const recentSuccess = getRecentSuccessRate(profile, 5)
  const errors = getConsecutiveErrors(profile)
  const roundedDifficulty = clampLevelToRange(Math.round(profile.currentDifficulty), options.levelRange)
  const preferredType = chooseProblemType(profile, recentSuccess, errors)
  const warmupLevel = getWarmupLevel(profile, roundedDifficulty)
  const allowedTypes = normalizeAllowedTypes(options.allowedTypes)
  const assignmentType = allowedTypes.length === 1 ? allowedTypes[0] : null

  // Efter frånvaro: börja lite enklare för att nå 80/20-zonen snabbare.
  if (warmupLevel !== null) {
    return generateByDifficultyWithOptions(warmupLevel, {
      preferredType: assignmentType || 'addition',
      allowedTypes
    })
  }

  // Om 3+ fel i rad → ge lättare problem ("easy win")
  if (errors >= 3) {
    const easyLevel = clampLevelToRange(Math.max(1, roundedDifficulty - 1), options.levelRange)
    return generateByDifficultyWithOptions(easyLevel, {
      preferredType: assignmentType || 'addition',
      allowedTypes
    })
  }

  // Om för lätt (>92% success) → öka
  if (recentSuccess > 0.92 && profile.recentProblems.length >= 6) {
    const harderLevel = clampLevelToRange(Math.min(12, roundedDifficulty + 1), options.levelRange)
    return generateByDifficultyWithOptions(harderLevel, { preferredType, allowedTypes })
  }

  // Om för svårt (<55% success) → minska
  if (recentSuccess < 0.55 && profile.recentProblems.length >= 6) {
    const easierLevel = clampLevelToRange(Math.max(1, roundedDifficulty - 1), options.levelRange)
    return generateByDifficultyWithOptions(easierLevel, {
      preferredType: assignmentType || 'addition',
      allowedTypes
    })
  }

  // Hjälp elever att komma loss från nivå 1 med försiktig utmaning
  if (roundedDifficulty === 1 && recentSuccess >= 0.6 && profile.recentProblems.length >= 8) {
    if (Math.random() < 0.3) {
      return generateByDifficultyWithOptions(clampLevelToRange(2, options.levelRange), {
        preferredType: assignmentType || 'addition',
        allowedTypes
      })
    }
  }

  // Normal: generera på nuvarande nivå
  return generateByDifficultyWithOptions(roundedDifficulty, { preferredType, allowedTypes })
}

function ensureDifficultyMeta(profile) {
  if (typeof profile.highestDifficulty !== 'number' || Number.isNaN(profile.highestDifficulty)) {
    profile.highestDifficulty = profile.currentDifficulty || 1
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
function chooseProblemType(profile, recentSuccess, errors) {
  const attempts = profile.recentProblems.length
  const difficulty = profile.currentDifficulty

  // Skydda kämpande elever: håll dig till addition tills grunden sitter
  if (errors >= 2 || recentSuccess < 0.65) return 'addition'
  if (attempts < 10 || difficulty < 3.5) return 'addition'

  // Stegvis typmix:
  // - subtraktion kommer före multiplikation
  const options = [{ type: 'addition', weight: 0.6 }]

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
  return allowedTypes.filter(Boolean)
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

/**
 * Avgör om eleven behöver paus
 */
export function shouldSuggestBreak(profile, sessionProblemCount) {
  // Efter 15 problem
  if (sessionProblemCount >= 15) return true

  // Om 5+ fel på senaste 10
  if (profile.recentProblems.length >= 10) {
    const last10 = profile.recentProblems.slice(-10)
    const errors = last10.filter(p => !p.correct).length
    if (errors >= 5) return true
  }

  return false
}
