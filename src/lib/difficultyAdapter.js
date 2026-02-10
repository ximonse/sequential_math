/**
 * Difficulty Adapter - Justerar svårighetsgrad baserat på prestation
 */

import { generateByDifficulty } from './problemGenerator'
import { getRecentSuccessRate, getConsecutiveErrors, getCurrentStreak } from './studentProfile'

/**
 * Justera svårighetsgrad efter ett svar
 */
export function adjustDifficulty(profile, wasCorrect) {
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

  return profile.currentDifficulty
}

/**
 * Välj nästa problem baserat på profil
 */
export function selectNextProblem(profile) {
  const recentSuccess = getRecentSuccessRate(profile, 5)
  const errors = getConsecutiveErrors(profile)
  const roundedDifficulty = Math.round(profile.currentDifficulty)

  // Om 3+ fel i rad → ge lättare problem ("easy win")
  if (errors >= 3) {
    const easyLevel = Math.max(1, roundedDifficulty - 1)
    return generateByDifficulty(easyLevel)
  }

  // Om för lätt (>92% success) → öka
  if (recentSuccess > 0.92 && profile.recentProblems.length >= 6) {
    const harderLevel = Math.min(12, roundedDifficulty + 1)
    return generateByDifficulty(harderLevel)
  }

  // Om för svårt (<55% success) → minska
  if (recentSuccess < 0.55 && profile.recentProblems.length >= 6) {
    const easierLevel = Math.max(1, roundedDifficulty - 1)
    return generateByDifficulty(easierLevel)
  }

  // Hjälp elever att komma loss från nivå 1 med försiktig utmaning
  if (roundedDifficulty === 1 && recentSuccess >= 0.6 && profile.recentProblems.length >= 8) {
    if (Math.random() < 0.3) {
      return generateByDifficulty(2)
    }
  }

  // Normal: generera på nuvarande nivå
  return generateByDifficulty(roundedDifficulty)
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
