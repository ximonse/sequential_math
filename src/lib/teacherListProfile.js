export const TEACHER_LIST_PROFILE_SCHEMA_VERSION = 1

const TEACHER_LIST_FIELDS = [
  'studentId',
  'name',
  'grade',
  'profileSchemaVersion',
  'created_at',
  'currentDifficulty',
  'highestDifficulty',
  'adaptive',
  'activity',
  'masteryFacts',
  'recentProblems',
  'stats',
  'telemetry',
  'ticketInbox',
  'ticketRevealAll',
  'ticketResponses',
  'classId',
  'classIds',
  'className',
  'teacherSummary',
  'tableDrill',
  'serverRevision',
  'serverUpdatedAt'
]

/**
 * Read-only profile shape returned to teacher dashboards. It deliberately has
 * no full history or password material and must never be persisted as a
 * student profile.
 */
export function toTeacherListProfile(profile) {
  if (!profile || typeof profile !== 'object') return null

  const listProfile = {
    teacherListSchemaVersion: TEACHER_LIST_PROFILE_SCHEMA_VERSION
  }
  for (const field of TEACHER_LIST_FIELDS) {
    if (Object.hasOwn(profile, field)) listProfile[field] = profile[field]
  }
  listProfile.auth = { lastLoginAt: profile.auth?.lastLoginAt || null,
    loginCount: Number(profile.auth?.loginCount) || 0,
    passwordUpdatedAt: profile.auth?.passwordUpdatedAt || null, failedCodeAttempts: Number(profile.auth?.failedCodeAttempts) || 0, lastFailedCodeAt: profile.auth?.lastFailedCodeAt || null }
  return listProfile
}

export function isTeacherListProfile(profile) {
  return Boolean(
    profile
    && typeof profile === 'object'
    && profile.teacherListSchemaVersion === TEACHER_LIST_PROFILE_SCHEMA_VERSION
    && typeof profile.studentId === 'string'
    && profile.studentId.trim() !== ''
    && Array.isArray(profile.recentProblems)
    && profile.stats
    && typeof profile.stats === 'object'
    && profile.masteryFacts
    && typeof profile.masteryFacts === 'object'
    && Array.isArray(profile.masteryFacts.facts)
    && Array.isArray(profile.masteryFacts.revokedIds)
    && !Object.hasOwn(profile, 'problemLog')
  )
}

export function normalizeTeacherListProfile(raw, normalizeStudentId) {
  if (!isTeacherListProfile(raw)) return null
  const studentId = normalizeStudentId(raw.studentId)
  if (!studentId) return null

  return {
    ...raw,
    studentId,
    recentProblems: raw.recentProblems,
    auth: {
      lastLoginAt: raw.auth?.lastLoginAt || null,
      loginCount: Number.isFinite(Number(raw.auth?.loginCount))
        ? Number(raw.auth.loginCount)
        : 0,
      passwordUpdatedAt: raw.auth?.passwordUpdatedAt || null, failedCodeAttempts: Number(raw.auth?.failedCodeAttempts) || 0, lastFailedCodeAt: raw.auth?.lastFailedCodeAt || null
    }
  }
}
