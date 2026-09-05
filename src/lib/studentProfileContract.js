export const STUDENT_PROFILE_SCHEMA_VERSION = 1
export const STUDENT_PASSWORD_SCHEME = 'sha256-v1'

export function isCurrentStudentProfile(profile) {
  return Boolean(
    profile
    && typeof profile === 'object'
    && profile.profileSchemaVersion === STUDENT_PROFILE_SCHEMA_VERSION
    && typeof profile.studentId === 'string'
    && profile.studentId.trim() !== ''
    && Array.isArray(profile.recentProblems)
    && Array.isArray(profile.problemLog)
    && profile.masteryFacts
    && typeof profile.masteryFacts === 'object'
    && Array.isArray(profile.masteryFacts.facts)
    && Array.isArray(profile.masteryFacts.revokedIds)
    && profile.stats
    && typeof profile.stats === 'object'
  )
}

export function hasCurrentStudentPassword(auth) {
  return Boolean(
    auth
    && auth.passwordScheme === STUDENT_PASSWORD_SCHEME
    && typeof auth.passwordHash === 'string'
    && auth.passwordHash.trim() !== ''
    && typeof auth.passwordSalt === 'string'
    && auth.passwordSalt.trim() !== ''
  )
}
