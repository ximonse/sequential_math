import { mutateStudentRecord, studentStoreError } from '../../_studentStore.js'
import { assertTeacherStudentAccess } from '../../_studentAccess.js'
import { createHash } from 'node:crypto'
import { verifyStudentCredential } from '../../_studentPassword.js'
import {
  isLiveTeacherApiAuthorized,
  secureCompare,
  withCors
} from '../../_helpers.js'
import {
  hasCurrentStudentPassword,
  isCurrentStudentProfile
} from '../../../src/lib/studentProfileContract.js'

const MAX_PROBLEM_LOG = 5000
const MAX_RECENT_PROBLEMS = 250
const MAX_TABLE_COMPLETIONS = 1000

function hashPasswordWithSalt(password, salt) {
  return createHash('sha256')
    .update(`${salt}:${String(password || '')}`)
    .digest('hex')
}

function verifyPasswordAgainstAuth(auth, studentPassword) {
  const provided = String(studentPassword || '')
  if (!provided) return false
  if (hasCurrentStudentPassword(auth)) {
    const expected = String(auth.passwordHash)
    const salt = String(auth.passwordSalt)
    const actual = hashPasswordWithSalt(provided, salt)
    return secureCompare(actual, expected) || secureCompare(hashPasswordWithSalt(provided.toUpperCase(), salt), expected)
  }
  return false
}

function applyProblemResult(profile, payload) {
  if (!payload || typeof payload !== 'object') return false
  if (!payload.problemId && !payload.timestamp) return false

  // Dedup: kolla om redan finns i problemLog
  const ts = Number(payload.timestamp || 0)
  const pid = payload.problemId || ''
  if (Array.isArray(profile.problemLog) && ts > 0 && pid) {
    const exists = profile.problemLog.some(
      p => p.problemId === pid && Number(p.timestamp) === ts
    )
    if (exists) return false // redan applicerad
  }

  if (!Array.isArray(profile.recentProblems)) profile.recentProblems = []
  if (!Array.isArray(profile.problemLog)) profile.problemLog = []

  profile.recentProblems.push(payload)
  if (profile.recentProblems.length > MAX_RECENT_PROBLEMS) {
    profile.recentProblems = profile.recentProblems.slice(-MAX_RECENT_PROBLEMS)
  }

  profile.problemLog.push(payload)
  if (profile.problemLog.length > MAX_PROBLEM_LOG) {
    profile.problemLog = profile.problemLog.slice(-MAX_PROBLEM_LOG)
  }

  return true
}

function applyMasteryAchieved(profile, payload) {
  if (!payload?.operation || !payload?.level) return false

  if (!profile.masteryFacts || typeof profile.masteryFacts !== 'object') {
    profile.masteryFacts = { version: 1, facts: [], revokedIds: [] }
  }
  if (!Array.isArray(profile.masteryFacts.facts)) {
    profile.masteryFacts.facts = []
  }

  // Dedup: kolla om samma operation+level redan finns
  const exists = profile.masteryFacts.facts.some(
    f => f.operation === payload.operation && f.level === payload.level
  )
  if (exists) return false

  const achievedAt = payload.window?.achievedAt || Date.now()
  profile.masteryFacts.facts.push({
    id: `${payload.operation}:${payload.level}:${achievedAt}`,
    operation: payload.operation,
    level: payload.level,
    achievedAt,
    window: payload.window || { attempts: 0, correct: 0, rate: 0 },
    source: 'wal'
  })

  return true
}

function applyTableCompleted(profile, payload, entry) {
  const table = Number(payload?.table)
  if (!Number.isFinite(table) || table < 2 || table > 12) return false

  if (!profile.tableDrill || typeof profile.tableDrill !== 'object') {
    profile.tableDrill = { completions: [] }
  }
  if (!Array.isArray(profile.tableDrill.completions)) {
    profile.tableDrill.completions = []
  }

  const timestamp = Number(payload.timestamp || entry.timestamp)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false
  if (profile.tableDrill.completions.some(item =>
    item.eventId === entry.id || (item.table === table && item.timestamp === timestamp)
  )) return false
  profile.tableDrill.completions.push({ table, timestamp, eventId: entry.id })
  if (profile.tableDrill.completions.length > MAX_TABLE_COMPLETIONS) {
    profile.tableDrill.completions = profile.tableDrill.completions.slice(-MAX_TABLE_COMPLETIONS)
  }

  return true
}

function validEntry(entry, studentId) {
  if (typeof entry?.id !== 'string' || !entry.id || !entry.payload) return false
  if (entry.studentId && String(entry.studentId).toUpperCase() !== studentId) return false
  const payload = entry.payload
  if (entry.type === 'problem_result') return typeof payload.problemId === 'string'
    && Boolean(payload.problemId) && Number.isFinite(payload.timestamp) && payload.timestamp > 0
    && typeof payload.correct === 'boolean'
  if (entry.type === 'table_completed') return Number.isInteger(payload.table)
    && payload.table >= 2 && payload.table <= 12
    && Number.isFinite(Number(payload.timestamp || entry.timestamp))
    && Number(payload.timestamp || entry.timestamp) > 0
  if (entry.type === 'mastery_achieved') return typeof payload.operation === 'string'
    && Boolean(payload.operation) && Number.isInteger(payload.level) && payload.level >= 1 && payload.level <= 12
  return false
}

function applyWalEntry(profile, entry) {
  if (!entry?.type || !entry?.payload) return false

  switch (entry.type) {
    case 'problem_result':
      return applyProblemResult(profile, entry.payload)
    case 'mastery_achieved':
      return applyMasteryAchieved(profile, entry.payload)
    case 'table_completed':
      return applyTableCompleted(profile, entry.payload, entry)
    default:
      return false
  }
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'POST,OPTIONS',
    headers: 'Content-Type, x-student-password, x-teacher-token'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const studentId = String(req.query.studentId || '').trim().toUpperCase()
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' })

  const entries = req.body?.entries
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'Missing or empty entries array' })
  }

  // Max 100 entries per request
  if (entries.length > 100) {
    return res.status(400).json({ error: 'Too many entries (max 100)' })
  }

  try {
    const teacherAuthorized = await isLiveTeacherApiAuthorized(req)
    const studentPassword = String(req.headers['x-student-password'] || '')
    if (entries.some(entry => !validEntry(entry, studentId))) {
      throw studentStoreError(400, 'Invalid event batch')
    }
    let appliedCount = 0
    const saved = await mutateStudentRecord(studentId, async existing => {
      if (!existing) throw studentStoreError(404, 'Student not found')
      if (!isCurrentStudentProfile(existing)) throw studentStoreError(409, 'Unsupported student profile schema')
      if (teacherAuthorized) await assertTeacherStudentAccess(req, existing)
      else if (!await verifyStudentCredential(existing, studentPassword)) throw studentStoreError(401, 'Unauthorized')
      const profile = structuredClone(existing)
      appliedCount = 0
      const sorted = [...entries].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      for (const entry of sorted) {
        if (applyWalEntry(profile, entry)) appliedCount++
      }
      return profile
    })

    return res.status(200).json({
      ok: true,
      ack: entries.map(entry => entry.id),
      appliedCount,
      serverRevision: saved.serverRevision
    })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage backend unavailable' })
  }
}
