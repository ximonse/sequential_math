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
