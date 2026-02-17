import { kv } from '@vercel/kv'
import { createHash, randomBytes } from 'node:crypto'
import {
  isTeacherApiAuthorized,
  withCors
} from '../_helpers'

const PASSWORD_SCHEME = 'sha256-v1'
const MAX_RECENT_PROBLEMS = 250
const MAX_PROBLEM_LOG = 5000
const MAX_TABLE_COMPLETIONS = 1000
const MAX_TELEMETRY_EVENTS = 1200
const MAX_TELEMETRY_DAYS = 120
const MAX_TICKET_RESPONSES = 500

function hasHashedPassword(auth) {
  return Boolean(
    auth
    && auth.passwordScheme === PASSWORD_SCHEME
    && typeof auth.passwordHash === 'string'
    && auth.passwordHash.trim() !== ''
    && typeof auth.passwordSalt === 'string'
    && auth.passwordSalt.trim() !== ''
  )
}

function hashPasswordWithSalt(password, salt) {
  return createHash('sha256')
    .update(`${salt}:${String(password || '')}`)
    .digest('hex')
}

function verifyPasswordAgainstAuth(auth, studentPassword) {
  const provided = String(studentPassword || '')
  if (!provided) return false

  if (hasHashedPassword(auth)) {
    const expected = String(auth.passwordHash)
    const actual = hashPasswordWithSalt(provided, String(auth.passwordSalt))
    return actual === expected
  }

  if (typeof auth?.password === 'string' && auth.password.trim() !== '') {
    return provided === auth.password
  }

  return false
}

function createSaltHex() {
  return randomBytes(16).toString('hex')
}

function normalizeProfileForStorage(profile, studentId, fallbackPassword = '') {
  const normalized = {
    ...profile,
    studentId
  }

  const auth = normalized.auth && typeof normalized.auth === 'object'
    ? { ...normalized.auth }
    : {}

  const plainPassword = typeof auth.password === 'string' ? auth.password : ''
  const effectivePassword = plainPassword || String(fallbackPassword || '')
  const alreadyHashed = hasHashedPassword(auth)

  if (!alreadyHashed) {
    if (!effectivePassword) {
      throw new Error('Missing password credentials')
    }
    const salt = createSaltHex()
    auth.passwordScheme = PASSWORD_SCHEME
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

function migrateLegacyProfileAuth(profile) {
  if (!profile || typeof profile !== 'object') {
    return { profile, migrated: false }
  }
  const auth = profile.auth && typeof profile.auth === 'object' ? { ...profile.auth } : null
  if (!auth) return { profile, migrated: false }
  if (hasHashedPassword(auth)) return { profile, migrated: false }
  if (typeof auth.password !== 'string' || auth.password.trim() === '') {
    return { profile, migrated: false }
  }

  const salt = createSaltHex()
  auth.passwordScheme = PASSWORD_SCHEME
  auth.passwordSalt = salt
  auth.passwordHash = hashPasswordWithSalt(auth.password, salt)
  auth.passwordUpdatedAt = auth.passwordUpdatedAt || Date.now()
  auth.lastLoginAt = auth.lastLoginAt || null
  auth.loginCount = Number.isFinite(Number(auth.loginCount)) ? Number(auth.loginCount) : 0
  delete auth.password

  return {
    profile: {
      ...profile,
      auth
    },
    migrated: true
  }
}

function normalizeTimestamp(value) {
  const ts = Number(value)
  if (!Number.isFinite(ts) || ts <= 0) return 0
  return ts
}

function getMaxTimestampFromEntries(entries, field = 'timestamp') {
  if (!Array.isArray(entries) || entries.length === 0) return 0
  let maxTs = 0
  for (const item of entries) {
    const ts = normalizeTimestamp(item?.[field])
    if (ts > maxTs) maxTs = ts
  }
  return maxTs
}

function stableSerialize(value) {
  if (value === null) return 'null'
  const type = typeof value
  if (type === 'number' || type === 'boolean' || type === 'string') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerialize(item)).join(',')}]`
  }
  if (type === 'object') {
    const keys = Object.keys(value).sort()
    const parts = keys.map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    return `{${parts.join(',')}}`
  }
  return JSON.stringify(String(value))
}

function buildProblemEntryKey(entry) {
  const id = String(entry?.problemId || '').trim()
  if (id) return `id:${id}`

  const type = String(entry?.problemType || '').trim()
  const ts = normalizeTimestamp(entry?.timestamp)
  const studentAnswer = String(entry?.studentAnswer ?? '')
  const correctAnswer = String(entry?.correctAnswer ?? '')
  const values = stableSerialize(entry?.values || {})
  return `raw:${type}|${ts}|${studentAnswer}|${correctAnswer}|${values}`
}

function mergeProblemEntries(existingEntries, incomingEntries, limit) {
  const mergedByKey = new Map()

  const upsert = (entry, sourceRank) => {
    if (!entry || typeof entry !== 'object') return
    const key = buildProblemEntryKey(entry)
    const ts = normalizeTimestamp(entry?.timestamp)
    const previous = mergedByKey.get(key)
    if (!previous) {
      mergedByKey.set(key, { entry, ts, sourceRank })
      return
    }
    if (ts > previous.ts || (ts === previous.ts && sourceRank >= previous.sourceRank)) {
      mergedByKey.set(key, { entry, ts, sourceRank })
    }
  }

  for (const entry of (Array.isArray(existingEntries) ? existingEntries : [])) {
    upsert(entry, 0)
  }
  for (const entry of (Array.isArray(incomingEntries) ? incomingEntries : [])) {
    upsert(entry, 1)
  }

  const merged = Array.from(mergedByKey.values())
    .map(item => item.entry)
    .sort((a, b) => normalizeTimestamp(a?.timestamp) - normalizeTimestamp(b?.timestamp))

  if (Number.isFinite(Number(limit)) && limit > 0 && merged.length > limit) {
    return merged.slice(-limit)
  }
  return merged
}

function mergeTableDrill(existingTableDrill, incomingTableDrill) {
  const existing = existingTableDrill && typeof existingTableDrill === 'object' ? existingTableDrill : {}
  const incoming = incomingTableDrill && typeof incomingTableDrill === 'object' ? incomingTableDrill : {}
  const mergedByKey = new Map()

  const addCompletion = (completion) => {
    const table = Number(completion?.table)
    const ts = normalizeTimestamp(completion?.timestamp)
    if (!Number.isFinite(table) || table <= 0 || ts <= 0) return
    const key = `${table}|${ts}`
    if (!mergedByKey.has(key)) {
      mergedByKey.set(key, { table, timestamp: ts })
    }
  }

  for (const completion of (Array.isArray(existing.completions) ? existing.completions : [])) {
    addCompletion(completion)
  }
  for (const completion of (Array.isArray(incoming.completions) ? incoming.completions : [])) {
    addCompletion(completion)
  }

  const completions = Array.from(mergedByKey.values())
    .sort((a, b) => a.timestamp - b.timestamp)

  const trimmedCompletions = completions.length > MAX_TABLE_COMPLETIONS
    ? completions.slice(-MAX_TABLE_COMPLETIONS)
    : completions

  const existingBossDate = String(existing.dailyBossShownDate || '').trim()
  const incomingBossDate = String(incoming.dailyBossShownDate || '').trim()
  const dailyBossShownDate = [existingBossDate, incomingBossDate]
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null

  return {
    ...existing,
    ...incoming,
    completions: trimmedCompletions,
    dailyBossShownDate
  }
}

function mergeTelemetry(existingTelemetry, incomingTelemetry) {
  const existing = existingTelemetry && typeof existingTelemetry === 'object' ? existingTelemetry : {}
  const incoming = incomingTelemetry && typeof incomingTelemetry === 'object' ? incomingTelemetry : {}
  const mergedEventsByKey = new Map()

  const addEvent = (event, sourceRank) => {
    if (!event || typeof event !== 'object') return
    const ts = normalizeTimestamp(event?.ts)
    const type = String(event?.type || '').trim()
    if (ts <= 0 || !type) return
    const payload = event?.payload && typeof event.payload === 'object' ? event.payload : {}
    const key = `${ts}|${type}|${stableSerialize(payload)}`
    const previous = mergedEventsByKey.get(key)
    if (!previous || sourceRank >= previous.sourceRank) {
      mergedEventsByKey.set(key, {
        event: { ts, type, payload },
        sourceRank
      })
    }
  }

  for (const event of (Array.isArray(existing.events) ? existing.events : [])) {
    addEvent(event, 0)
  }
  for (const event of (Array.isArray(incoming.events) ? incoming.events : [])) {
    addEvent(event, 1)
  }

  const events = Array.from(mergedEventsByKey.values())
    .map(item => item.event)
    .sort((a, b) => a.ts - b.ts)
  const trimmedEvents = events.length > MAX_TELEMETRY_EVENTS
    ? events.slice(-MAX_TELEMETRY_EVENTS)
    : events

  const existingDaily = existing.daily && typeof existing.daily === 'object' ? existing.daily : {}
  const incomingDaily = incoming.daily && typeof incoming.daily === 'object' ? incoming.daily : {}
  const dayKeys = Array.from(new Set([
    ...Object.keys(existingDaily),
    ...Object.keys(incomingDaily)
  ])).sort()
  const trimmedDayKeys = dayKeys.length > MAX_TELEMETRY_DAYS
    ? dayKeys.slice(-MAX_TELEMETRY_DAYS)
    : dayKeys

  const mergedDaily = {}
  for (const dayKey of trimmedDayKeys) {
    const existingBucket = existingDaily[dayKey] && typeof existingDaily[dayKey] === 'object'
      ? existingDaily[dayKey]
      : {}
    const incomingBucket = incomingDaily[dayKey] && typeof incomingDaily[dayKey] === 'object'
      ? incomingDaily[dayKey]
      : {}
    const metricKeys = new Set([...Object.keys(existingBucket), ...Object.keys(incomingBucket)])
    const mergedBucket = {}
    for (const metricKey of metricKeys) {
      const existingValue = Number(existingBucket[metricKey])
      const incomingValue = Number(incomingBucket[metricKey])
      if (Number.isFinite(existingValue) && Number.isFinite(incomingValue)) {
        mergedBucket[metricKey] = Math.max(existingValue, incomingValue)
      } else if (Number.isFinite(existingValue)) {
        mergedBucket[metricKey] = existingValue
      } else if (Number.isFinite(incomingValue)) {
        mergedBucket[metricKey] = incomingValue
      }
    }
    if (Object.keys(mergedBucket).length > 0) {
      mergedDaily[dayKey] = mergedBucket
    }
  }

  return {
    ...existing,
    ...incoming,
    events: trimmedEvents,
    daily: mergedDaily
  }
}

function mergeTicketResponses(existingResponses, incomingResponses) {
  const mergedByKey = new Map()

  const upsert = (response, sourceRank) => {
    if (!response || typeof response !== 'object') return
    const dispatchId = String(response.dispatchId || '').trim()
    const key = dispatchId || stableSerialize(response)
    const answeredAt = normalizeTimestamp(response?.answeredAt)
    const previous = mergedByKey.get(key)
    if (!previous || answeredAt > previous.answeredAt || (answeredAt === previous.answeredAt && sourceRank >= previous.sourceRank)) {
      mergedByKey.set(key, { response, answeredAt, sourceRank })
    }
  }

  for (const response of (Array.isArray(existingResponses) ? existingResponses : [])) {
    upsert(response, 0)
  }
  for (const response of (Array.isArray(incomingResponses) ? incomingResponses : [])) {
    upsert(response, 1)
  }

  const merged = Array.from(mergedByKey.values())
    .map(item => item.response)
    .sort((a, b) => normalizeTimestamp(b?.answeredAt) - normalizeTimestamp(a?.answeredAt))

  return merged.length > MAX_TICKET_RESPONSES
    ? merged.slice(0, MAX_TICKET_RESPONSES)
    : merged
}

function mergeTicketRevealAll(existingRevealMap, incomingRevealMap) {
  const existing = existingRevealMap && typeof existingRevealMap === 'object' ? existingRevealMap : {}
  const incoming = incomingRevealMap && typeof incomingRevealMap === 'object' ? incomingRevealMap : {}
  const merged = {}
  const keys = new Set([...Object.keys(existing), ...Object.keys(incoming)])
  for (const key of keys) {
    const left = normalizeTimestamp(existing[key])
    const right = normalizeTimestamp(incoming[key])
    const chosen = Math.max(left, right)
    if (chosen > 0) merged[key] = chosen
  }
  return merged
}

function getTicketInboxTimestamp(inbox) {
  if (!inbox || typeof inbox !== 'object') return 0
  return Math.max(
    normalizeTimestamp(inbox.updatedAt),
    normalizeTimestamp(inbox.publishedAt),
    normalizeTimestamp(inbox.clearedAt)
  )
}

function mergeTicketInbox(existingInbox, incomingInbox) {
  const existing = existingInbox && typeof existingInbox === 'object' ? existingInbox : null
  const incoming = incomingInbox && typeof incomingInbox === 'object' ? incomingInbox : null
  if (!existing && !incoming) return null
  if (!existing) return incoming
  if (!incoming) return existing

  const existingTs = getTicketInboxTimestamp(existing)
  const incomingTs = getTicketInboxTimestamp(incoming)
  if (incomingTs > existingTs) return { ...existing, ...incoming }
  if (existingTs > incomingTs) return { ...incoming, ...existing }
  return { ...existing, ...incoming }
}

function mergeActivity(existingActivity, incomingActivity) {
  const existing = existingActivity && typeof existingActivity === 'object' ? existingActivity : {}
  const incoming = incomingActivity && typeof incomingActivity === 'object' ? incomingActivity : {}
  const existingPresenceTs = normalizeTimestamp(existing.lastPresenceAt)
  const incomingPresenceTs = normalizeTimestamp(incoming.lastPresenceAt)
  const preferIncoming = incomingPresenceTs >= existingPresenceTs
  const fresher = preferIncoming ? incoming : existing
  const older = preferIncoming ? existing : incoming

  const createdAtCandidates = [normalizeTimestamp(existing.createdAt), normalizeTimestamp(incoming.createdAt)].filter(Boolean)
  const createdAt = createdAtCandidates.length > 0 ? Math.min(...createdAtCandidates) : Date.now()

  return {
    ...older,
    ...fresher,
    page: String(fresher.page || older.page || 'unknown'),
    inFocus: Boolean(fresher.inFocus),
    lastPresenceAt: Math.max(existingPresenceTs, incomingPresenceTs),
    lastInteractionAt: Math.max(
      normalizeTimestamp(existing.lastInteractionAt),
      normalizeTimestamp(incoming.lastInteractionAt)
    ),
    visibilityState: String(fresher.visibilityState || older.visibilityState || 'hidden'),
    createdAt
  }
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
    if (hasHashedPassword(existing) && !hasHashedPassword(incoming)) {
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

  if (hasHashedPassword(passwordSource)) {
    merged.passwordScheme = PASSWORD_SCHEME
    merged.passwordHash = passwordSource.passwordHash
    merged.passwordSalt = passwordSource.passwordSalt
    delete merged.password
  } else if (typeof passwordSource.password === 'string' && passwordSource.password.trim() !== '') {
    merged.password = passwordSource.password
    delete merged.passwordHash
    delete merged.passwordSalt
    delete merged.passwordScheme
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

function authMatchesExistingProfileCredentials(incomingProfile, existingProfile) {
  if (!incomingProfile || !existingProfile) return false
  const incomingAuth = incomingProfile?.auth && typeof incomingProfile.auth === 'object'
    ? incomingProfile.auth
    : {}
  const existingAuth = existingProfile?.auth && typeof existingProfile.auth === 'object'
    ? existingProfile.auth
    : {}

  if (hasHashedPassword(incomingAuth) && hasHashedPassword(existingAuth)) {
    return incomingAuth.passwordHash === existingAuth.passwordHash
      && incomingAuth.passwordSalt === existingAuth.passwordSalt
      && incomingAuth.passwordScheme === existingAuth.passwordScheme
  }

  if (
    typeof incomingAuth.password === 'string'
    && incomingAuth.password.trim() !== ''
    && typeof existingAuth.password === 'string'
    && existingAuth.password.trim() !== ''
  ) {
    return incomingAuth.password === existingAuth.password
  }

  return false
}

function mergeProfiles(existingProfile, incomingProfile) {
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

  merged.stats = mergeStats(
    existingProfile?.stats,
    incomingProfile?.stats,
    mergedRecentProblems,
    mergedProblemLog,
    preferIncoming
  )

  return merged
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,OPTIONS',
    headers: 'Content-Type, x-student-password, x-teacher-token, x-teacher-password'
  })
  if (req.method === 'OPTIONS') return res.status(200).end()

  const studentId = String(req.query.studentId || '').trim().toUpperCase()
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' })

  try {
    const key = `student:${studentId}`
    const teacherAuthorized = isTeacherApiAuthorized(req)
    const studentPassword = String(req.headers['x-student-password'] || '')
    const existing = await kv.get(key)

    const migration = migrateLegacyProfileAuth(existing)
    const existingMigrated = migration.profile
    if (migration.migrated) {
      await kv.set(key, existingMigrated)
    }

    if (req.method === 'GET') {
      const profile = existingMigrated || null
      if (!profile) return res.status(200).json({ profile: null })

      if (!teacherAuthorized && !verifyPasswordAgainstAuth(profile.auth, studentPassword)) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      return res.status(200).json({ profile })
    }

    if (req.method === 'POST') {
      const profile = req.body?.profile
      if (!profile || typeof profile !== 'object') {
        return res.status(400).json({ error: 'Missing profile in body' })
      }

      const incomingMatchesExistingAuth = existingMigrated
        ? authMatchesExistingProfileCredentials(profile, existingMigrated)
        : false

      if (existingMigrated) {
        if (
          !teacherAuthorized
          && !verifyPasswordAgainstAuth(existingMigrated.auth, studentPassword)
          && !incomingMatchesExistingAuth
        ) {
          return res.status(401).json({ error: 'Unauthorized' })
        }
      } else if (!teacherAuthorized && studentPassword.trim() === '') {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const normalizedIncoming = normalizeProfileForStorage(profile, studentId, studentPassword)
      const merged = existingMigrated
        ? mergeProfiles(existingMigrated, normalizedIncoming)
        : normalizedIncoming
      const normalizedMerged = normalizeProfileForStorage(merged, studentId, studentPassword)
      await kv.set(key, normalizedMerged)

      const indexKey = 'students:index'
      await kv.sadd(indexKey, studentId)

      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({
      error: 'Storage backend unavailable',
      details: error?.message || 'unknown'
    })
  }
}
