import { hashPasswordWithSalt } from '../_studentPassword.js'
import { randomBytes } from 'node:crypto'
import {
  STUDENT_PASSWORD_SCHEME,
  STUDENT_PROFILE_SCHEMA_VERSION,
  hasCurrentStudentPassword,
  isCurrentStudentProfile
} from '../../src/lib/studentProfileContract.js'
import {
  getMaxTimestampFromEntries,
  mergeActivity,
  mergeProblemEntries,
  mergeTableDrill,
  mergeTelemetry,
  mergeTicketInbox,
  mergeTicketResponses,
  mergeTicketRevealAll,
  normalizeTimestamp
} from './_profileMergeEntries.js'

const MAX_RECENT_PROBLEMS = 250
const MAX_PROBLEM_LOG = 5000
export function createSaltHex() {
  return randomBytes(16).toString('hex')
}

export function normalizeProfileForStorage(profile, studentId, fallbackPassword = '') {
  const normalized = {
    ...profile,
    studentId
  }
  if (!isCurrentStudentProfile(normalized)) {
    throw new Error('Unsupported student profile schema')
  }

  const auth = normalized.auth && typeof normalized.auth === 'object'
    ? { ...normalized.auth }
    : {}

  const alreadyHashed = hasCurrentStudentPassword(auth)

  if (!alreadyHashed) {
    const effectivePassword = String(fallbackPassword || '')
    if (!effectivePassword) {
      throw new Error('Missing password credentials')
    }
    const salt = createSaltHex()
    auth.passwordScheme = STUDENT_PASSWORD_SCHEME
    auth.passwordSalt = salt
    auth.passwordHash = hashPasswordWithSalt(effectivePassword, salt)
  }

  auth.passwordUpdatedAt = auth.passwordUpdatedAt || Date.now()
  auth.lastLoginAt = auth.lastLoginAt || null
  auth.loginCount = Number.isFinite(Number(auth.loginCount)) ? Number(auth.loginCount) : 0
  delete auth.password
  normalized.auth = auth
  return normalized
}

function mergeClassMembership(existingProfile, incomingProfile, preferIncoming) {
  const mergedClassIds = []
  const seen = new Set()
  const add = (value) => {
    const id = String(value || '').trim()
    if (!id || seen.has(id)) return
    seen.add(id)
    mergedClassIds.push(id)
  }

  add(existingProfile?.classId)
  for (const id of (Array.isArray(existingProfile?.classIds) ? existingProfile.classIds : [])) add(id)
  add(incomingProfile?.classId)
  for (const id of (Array.isArray(incomingProfile?.classIds) ? incomingProfile.classIds : [])) add(id)

  const preferred = preferIncoming ? incomingProfile : existingProfile
  let classId = String(preferred?.classId || '').trim()
  if (!classId || !mergedClassIds.includes(classId)) {
    classId = mergedClassIds[0] || ''
  }

  let className = ''
  if (classId && String(existingProfile?.classId || '') === classId) {
    className = String(existingProfile?.className || '').trim()
  }
  if (classId && String(incomingProfile?.classId || '') === classId) {
    className = String(incomingProfile?.className || '').trim() || className
  }
  className = className || String(preferred?.className || '').trim()

  return {
    classId: classId || null,
    classIds: mergedClassIds,
    className: className || null
  }
}

function toFiniteNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mergeStats(existingStats, incomingStats, mergedRecentProblems, mergedProblemLog, preferIncoming) {
  const existing = existingStats && typeof existingStats === 'object' ? existingStats : {}
  const incoming = incomingStats && typeof incomingStats === 'object' ? incomingStats : {}
  const preferred = preferIncoming ? incoming : existing
  const alternate = preferIncoming ? existing : incoming
  const stats = {
    ...alternate,
    ...preferred
  }

  const derivedRecent = Array.isArray(mergedRecentProblems) ? mergedRecentProblems.length : 0
  const derivedLog = Array.isArray(mergedProblemLog) ? mergedProblemLog.length : 0
  const lifetimeProblems = Math.max(
    toFiniteNumber(existing.lifetimeProblems),
    toFiniteNumber(incoming.lifetimeProblems),
    toFiniteNumber(existing.totalProblems),
    toFiniteNumber(incoming.totalProblems),
    derivedRecent,
    derivedLog
  )
  const lifetimeCorrect = Math.max(
    0,
    Math.min(
      lifetimeProblems,
      Math.max(
        toFiniteNumber(existing.lifetimeCorrectAnswers),
        toFiniteNumber(incoming.lifetimeCorrectAnswers),
        toFiniteNumber(existing.correctAnswers),
        toFiniteNumber(incoming.correctAnswers)
      )
    )
  )
  const lifetimeTimeSpent = Math.max(
    toFiniteNumber(existing.lifetimeTimeSpent),
    toFiniteNumber(incoming.lifetimeTimeSpent),
    toFiniteNumber(existing.avgTimePerProblem) * Math.max(1, toFiniteNumber(existing.totalProblems)),
    toFiniteNumber(incoming.avgTimePerProblem) * Math.max(1, toFiniteNumber(incoming.totalProblems))
  )
  const lifetimeSpeedSamples = Math.max(
    toFiniteNumber(existing.lifetimeSpeedSamples),
    toFiniteNumber(incoming.lifetimeSpeedSamples)
  )
  const lifetimeSpeedTimeSpent = Math.max(
    toFiniteNumber(existing.lifetimeSpeedTimeSpent),
    toFiniteNumber(incoming.lifetimeSpeedTimeSpent)
  )

  const existingTypeStats = existing.typeStats && typeof existing.typeStats === 'object' ? existing.typeStats : {}
  const incomingTypeStats = incoming.typeStats && typeof incoming.typeStats === 'object' ? incoming.typeStats : {}
  const useIncomingTypeStats = Object.keys(incomingTypeStats).length >= Object.keys(existingTypeStats).length

  stats.totalProblems = lifetimeProblems
  stats.correctAnswers = lifetimeCorrect
  stats.lifetimeProblems = lifetimeProblems
  stats.lifetimeCorrectAnswers = lifetimeCorrect
  stats.lifetimeTimeSpent = lifetimeTimeSpent
  stats.lifetimeSpeedSamples = lifetimeSpeedSamples
  stats.lifetimeSpeedTimeSpent = lifetimeSpeedTimeSpent
  stats.overallSuccessRate = lifetimeProblems > 0 ? lifetimeCorrect / lifetimeProblems : 0
  stats.avgTimePerProblem = lifetimeProblems > 0 ? lifetimeTimeSpent / lifetimeProblems : 0
  stats.avgSpeedTimePerProblem = lifetimeSpeedSamples > 0 ? lifetimeSpeedTimeSpent / lifetimeSpeedSamples : 0
  stats.typeStats = useIncomingTypeStats ? incomingTypeStats : existingTypeStats
  stats.weakestTypes = Array.isArray(preferred.weakestTypes) && preferred.weakestTypes.length > 0
    ? preferred.weakestTypes
    : (Array.isArray(alternate.weakestTypes) ? alternate.weakestTypes : [])
  stats.strongestTypes = Array.isArray(preferred.strongestTypes) && preferred.strongestTypes.length > 0
    ? preferred.strongestTypes
    : (Array.isArray(alternate.strongestTypes) ? alternate.strongestTypes : [])

  return stats
}

function mergeAuth(existingAuth, incomingAuth) {
  const existing = existingAuth && typeof existingAuth === 'object' ? existingAuth : {}
  const incoming = incomingAuth && typeof incomingAuth === 'object' ? incomingAuth : {}
  const existingPwdTs = normalizeTimestamp(existing.passwordUpdatedAt)
  const incomingPwdTs = normalizeTimestamp(incoming.passwordUpdatedAt)

  let passwordSource = incoming
  if (existingPwdTs > incomingPwdTs) {
    passwordSource = existing
  } else if (existingPwdTs === incomingPwdTs) {
    if (hasCurrentStudentPassword(existing) && !hasCurrentStudentPassword(incoming)) {
      passwordSource = existing
    }
  }

  const merged = {
    ...existing,
    ...incoming,
    passwordUpdatedAt: Math.max(existingPwdTs, incomingPwdTs) || null,
    lastLoginAt: Math.max(
      normalizeTimestamp(existing.lastLoginAt),
      normalizeTimestamp(incoming.lastLoginAt)
    ) || null,
    loginCount: Math.max(toFiniteNumber(existing.loginCount), toFiniteNumber(incoming.loginCount))
  }

  if (hasCurrentStudentPassword(passwordSource)) {
    merged.passwordScheme = STUDENT_PASSWORD_SCHEME
    merged.passwordHash = passwordSource.passwordHash
    merged.passwordSalt = passwordSource.passwordSalt
    delete merged.password
  }

  return merged
}

function getProfileFreshnessTimestamp(profile) {
  if (!profile || typeof profile !== 'object') return 0
  return Math.max(
    getMaxTimestampFromEntries(profile.recentProblems, 'timestamp'),
    getMaxTimestampFromEntries(profile.problemLog, 'timestamp'),
    getMaxTimestampFromEntries(profile?.tableDrill?.completions, 'timestamp'),
    getMaxTimestampFromEntries(profile.ticketResponses, 'answeredAt'),
    normalizeTimestamp(profile?.ticketInbox?.updatedAt),
    normalizeTimestamp(profile?.ticketInbox?.publishedAt),
    normalizeTimestamp(profile?.ticketInbox?.clearedAt),
    normalizeTimestamp(profile?.activity?.lastPresenceAt),
    normalizeTimestamp(profile?.activity?.lastInteractionAt),
    normalizeTimestamp(profile?.auth?.lastLoginAt)
  )
}

function mergeAdaptive(existingAdaptive, incomingAdaptive, preferIncoming) {
  const existing = existingAdaptive && typeof existingAdaptive === 'object' ? existingAdaptive : {}
  const incoming = incomingAdaptive && typeof incomingAdaptive === 'object' ? incomingAdaptive : {}
  const fresher = preferIncoming ? incoming : existing
  const older = preferIncoming ? existing : incoming

  const existingAbilities = existing.operationAbilities && typeof existing.operationAbilities === 'object'
    ? existing.operationAbilities : {}
  const incomingAbilities = incoming.operationAbilities && typeof incoming.operationAbilities === 'object'
    ? incoming.operationAbilities : {}
  const mergedAbilities = { ...existingAbilities }
  for (const op of Object.keys(incomingAbilities)) {
    const a = toFiniteNumber(existingAbilities[op], 1)
    const b = toFiniteNumber(incomingAbilities[op], 1)
    mergedAbilities[op] = Math.max(a, b)
  }

  const existingSkills = existing.skillStates && typeof existing.skillStates === 'object'
    ? existing.skillStates : {}
  const incomingSkills = incoming.skillStates && typeof incoming.skillStates === 'object'
    ? incoming.skillStates : {}
  const mergedSkills = { ...existingSkills }
  for (const tag of Object.keys(incomingSkills)) {
    const prev = mergedSkills[tag]
    const next = incomingSkills[tag]
    if (!prev) {
      mergedSkills[tag] = next
    } else {
      const prevAttempts = toFiniteNumber(prev?.attempts)
      const nextAttempts = toFiniteNumber(next?.attempts)
      mergedSkills[tag] = nextAttempts >= prevAttempts ? next : prev
    }
  }

  return {
    ...older,
    ...fresher,
    operationAbilities: mergedAbilities,
    skillStates: mergedSkills,
    recentSelections: Array.isArray(fresher.recentSelections) ? fresher.recentSelections : (Array.isArray(older.recentSelections) ? older.recentSelections : [])
  }
}

function mergeMasteryFacts(existing, incoming) {
  const a = existing?.masteryFacts
  const b = incoming?.masteryFacts
  if (!a && !b) return { version: 1, facts: [], revokedIds: [] }
  if (!a) return { version: 1, facts: Array.isArray(b.facts) ? b.facts : [], revokedIds: Array.isArray(b.revokedIds) ? b.revokedIds : [] }
  if (!b) return { version: 1, facts: Array.isArray(a.facts) ? a.facts : [], revokedIds: Array.isArray(a.revokedIds) ? a.revokedIds : [] }

  // Union av facts baserat på id (idempotent)
  const factsById = new Map()
  for (const fact of (Array.isArray(a.facts) ? a.facts : [])) {
    if (fact?.id) factsById.set(fact.id, fact)
  }
  for (const fact of (Array.isArray(b.facts) ? b.facts : [])) {
    if (fact?.id && !factsById.has(fact.id)) factsById.set(fact.id, fact)
  }

  // Dedup: om samma operation+level finns flera gånger, behåll äldsta (first achieved)
  const byOpLevel = new Map()
  for (const fact of factsById.values()) {
    const key = `${fact.operation}:${fact.level}`
    const existing = byOpLevel.get(key)
    if (!existing || fact.achievedAt < existing.achievedAt) {
      byOpLevel.set(key, fact)
    }
  }

  // Union av revokedIds
  const revokedSet = new Set([
    ...(Array.isArray(a.revokedIds) ? a.revokedIds : []),
    ...(Array.isArray(b.revokedIds) ? b.revokedIds : [])
  ])

  return {
    version: 1,
    facts: [...byOpLevel.values()],
    revokedIds: [...revokedSet]
  }
}

export function mergeProfiles(existingProfile, incomingProfile) {
  const existingFreshness = getProfileFreshnessTimestamp(existingProfile)
  const incomingFreshness = getProfileFreshnessTimestamp(incomingProfile)
  const preferIncoming = incomingFreshness >= existingFreshness
  const fresher = preferIncoming ? incomingProfile : existingProfile
  const older = preferIncoming ? existingProfile : incomingProfile

  const merged = {
    ...older,
    ...fresher
  }

  merged.studentId = String(existingProfile?.studentId || incomingProfile?.studentId || '').trim().toUpperCase()

  merged.profileSchemaVersion = STUDENT_PROFILE_SCHEMA_VERSION
  const createdCandidates = [
    normalizeTimestamp(existingProfile?.created_at),
    normalizeTimestamp(incomingProfile?.created_at)
  ].filter(Boolean)
  merged.created_at = createdCandidates.length > 0 ? Math.min(...createdCandidates) : Date.now()

  const mergedRecentProblems = mergeProblemEntries(
    existingProfile?.recentProblems,
    incomingProfile?.recentProblems,
    MAX_RECENT_PROBLEMS
  )
  const mergedProblemLog = mergeProblemEntries(
    existingProfile?.problemLog,
    incomingProfile?.problemLog,
    MAX_PROBLEM_LOG
  )
  merged.recentProblems = mergedRecentProblems
  merged.problemLog = mergedProblemLog

  merged.tableDrill = mergeTableDrill(existingProfile?.tableDrill, incomingProfile?.tableDrill)
  merged.telemetry = mergeTelemetry(existingProfile?.telemetry, incomingProfile?.telemetry)
  merged.ticketResponses = mergeTicketResponses(existingProfile?.ticketResponses, incomingProfile?.ticketResponses)
  merged.ticketRevealAll = mergeTicketRevealAll(existingProfile?.ticketRevealAll, incomingProfile?.ticketRevealAll)
  merged.ticketInbox = mergeTicketInbox(existingProfile?.ticketInbox, incomingProfile?.ticketInbox)
  merged.activity = mergeActivity(existingProfile?.activity, incomingProfile?.activity)
  merged.auth = mergeAuth(existingProfile?.auth, incomingProfile?.auth)

  const mergedClassMembership = mergeClassMembership(existingProfile, incomingProfile, preferIncoming)
  merged.classId = mergedClassMembership.classId
  merged.classIds = mergedClassMembership.classIds
  merged.className = mergedClassMembership.className

  merged.currentDifficulty = Math.max(1, toFiniteNumber(
    fresher?.currentDifficulty,
    toFiniteNumber(older?.currentDifficulty, 1)
  ))
  merged.highestDifficulty = Math.max(
    merged.currentDifficulty,
    toFiniteNumber(existingProfile?.highestDifficulty),
    toFiniteNumber(incomingProfile?.highestDifficulty),
    toFiniteNumber(existingProfile?.currentDifficulty),
    toFiniteNumber(incomingProfile?.currentDifficulty)
  )

  merged.adaptive = mergeAdaptive(existingProfile?.adaptive, incomingProfile?.adaptive, preferIncoming)
  merged.masteryFacts = mergeMasteryFacts(existingProfile, incomingProfile)

  merged.stats = mergeStats(
    existingProfile?.stats,
    incomingProfile?.stats,
    mergedRecentProblems,
    mergedProblemLog,
    preferIncoming
  )

  // teacherSummary och effectiveLevels är cache — beräknas klient-side, inte mergade
  delete merged.effectiveLevels
  delete merged.teacherSummary

  return merged
}