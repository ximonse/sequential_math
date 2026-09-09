import { computeTeacherSummary } from './masteryCalculation.js'
import { ALL_LEVELS, ALL_OPERATIONS } from './operations.js'

export function deriveTeacherSummary(profile) {
  return computeTeacherSummary(profile, ALL_OPERATIONS, ALL_LEVELS)
}

export function refreshTeacherSummary(profile) {
  if (!profile || typeof profile !== 'object') return profile
  profile.teacherSummary = deriveTeacherSummary(profile)
  delete profile.effectiveLevels
  return profile
}

export function withFreshTeacherSummary(profile) {
  if (!profile || typeof profile !== 'object') return profile
  return refreshTeacherSummary({
    ...profile,
    masteryFacts: profile.masteryFacts && typeof profile.masteryFacts === 'object'
      ? {
          ...profile.masteryFacts,
          facts: Array.isArray(profile.masteryFacts.facts) ? [...profile.masteryFacts.facts] : [],
          revokedIds: Array.isArray(profile.masteryFacts.revokedIds) ? [...profile.masteryFacts.revokedIds] : []
        }
      : profile.masteryFacts
  })
}

export function getCurrentWeekTeacherEvidence(profile, expectedPeriodStart) {
  return getTeacherPeriodEvidence(profile, 'currentWeek', expectedPeriodStart)
}

export function getCurrentDayTeacherEvidence(profile, expectedPeriodStart) {
  return getTeacherPeriodEvidence(profile, 'currentDay', expectedPeriodStart)
}

export function getRolling30DayTeacherEvidence(profile, expectedPeriodStart) {
  return getTeacherPeriodEvidence(profile, 'rolling30Days', expectedPeriodStart)
}

function getTeacherPeriodEvidence(profile, periodKey, expectedPeriodStart) {
  const summary = profile?.teacherSummary
  const period = summary?.[periodKey]
  if (!period || typeof period !== 'object') return null
  if (Number(period.periodStart) !== Number(expectedPeriodStart)) return null

  const attempts = Math.max(0, Number(period.attempts) || 0)
  const correct = Math.max(0, Math.min(attempts, Number(period.correct) || 0))
  const speedSamples = Math.max(0, Number(period.speedSamples) || 0)
  const totalSpeedSec = Math.max(0, Number(period.totalSpeedSec) || 0)

  return {
    attempts,
    correct,
    wrong: attempts - correct,
    accuracy: attempts > 0 ? correct / attempts : 0,
    activeDays: Math.max(0, Number(period.activeDays) || 0),
    totalSpeedSec,
    speedSamples,
    avgSpeedSec: speedSamples > 0 ? totalSpeedSec / speedSamples : 0,
    knowledgeErrors: Math.max(0, Number(period.knowledgeErrors) || 0),
    inattentionErrors: Math.max(0, Number(period.inattentionErrors) || 0),
    historyComplete: summary?.evidence?.historyComplete === true,
    historySource: String(summary?.evidence?.historySource || 'recentProblems'),
    summaryUpdatedAt: Number(summary?.updatedAt) || 0
  }
}
