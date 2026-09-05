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
  const summary = profile?.teacherSummary
  const week = summary?.currentWeek
  if (!week || typeof week !== 'object') return null
  if (Number(week.periodStart) !== Number(expectedPeriodStart)) return null

  const attempts = Math.max(0, Number(week.attempts) || 0)
  const correct = Math.max(0, Math.min(attempts, Number(week.correct) || 0))
  const speedSamples = Math.max(0, Number(week.speedSamples) || 0)
  const totalSpeedSec = Math.max(0, Number(week.totalSpeedSec) || 0)

  return {
    attempts,
    correct,
    wrong: attempts - correct,
    accuracy: attempts > 0 ? correct / attempts : 0,
    activeDays: Math.max(0, Number(week.activeDays) || 0),
    totalSpeedSec,
    speedSamples,
    avgSpeedSec: speedSamples > 0 ? totalSpeedSec / speedSamples : 0,
    knowledgeErrors: Math.max(0, Number(week.knowledgeErrors) || 0),
    inattentionErrors: Math.max(0, Number(week.inattentionErrors) || 0),
    historyComplete: summary?.evidence?.historyComplete === true,
    historySource: String(summary?.evidence?.historySource || 'recentProblems'),
    summaryUpdatedAt: Number(summary?.updatedAt) || 0
  }
}
