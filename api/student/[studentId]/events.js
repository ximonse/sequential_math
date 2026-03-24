import { kv } from '@vercel/kv'
import { createHash } from 'node:crypto'
import {
  isTeacherApiAuthorized,
  secureCompare,
  withCors
} from '../../_helpers.js'

const PASSWORD_SCHEME = 'sha256-v1'
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
  if (
    auth
    && auth.passwordScheme === PASSWORD_SCHEME
    && typeof auth.passwordHash === 'string'
    && auth.passwordHash.trim() !== ''
    && typeof auth.passwordSalt === 'string'
    && auth.passwordSalt.trim() !== ''
  ) {
    const expected = String(auth.passwordHash)
    const salt = String(auth.passwordSalt)
    const actual = hashPasswordWithSalt(provided, salt)
    return secureCompare(actual, expected)
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

function applyTableCompleted(profile, payload) {
  const table = Number(payload?.table)
  if (!Number.isFinite(table) || table < 2 || table > 12) return false

  if (!profile.tableDrill || typeof profile.tableDrill !== 'object') {
    profile.tableDrill = { completions: [] }
  }
  if (!Array.isArray(profile.tableDrill.completions)) {
    profile.tableDrill.completions = []
  }

  profile.tableDrill.completions.push({ table, timestamp: Date.now() })
  if (profile.tableDrill.completions.length > MAX_TABLE_COMPLETIONS) {
    profile.tableDrill.completions = profile.tableDrill.completions.slice(-MAX_TABLE_COMPLETIONS)
  }

  return true
}

function applyWalEntry(profile, entry) {
  if (!entry?.type || !entry?.payload) return false

  switch (entry.type) {
    case 'problem_result':
      return applyProblemResult(profile, entry.payload)
    case 'mastery_achieved':
      return applyMasteryAchieved(profile, entry.payload)
    case 'table_completed':
      return applyTableCompleted(profile, entry.payload)
    default:
      return false
  }
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'POST,OPTIONS',
    headers: 'Content-Type, x-student-password, x-teacher-token, x-teacher-password'
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
    const key = `student:${studentId}`
    const existing = await kv.get(key)
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' })
    }

    // Auth
    const teacherAuthorized = isTeacherApiAuthorized(req)
    const studentPassword = String(req.headers['x-student-password'] || '')
    if (!teacherAuthorized && !verifyPasswordAgainstAuth(existing.auth, studentPassword)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Applicera entries i tidsordning
    const sorted = [...entries].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    const acked = []
    const profile = { ...existing }

    for (const entry of sorted) {
      const applied = applyWalEntry(profile, entry)
      if (entry.id) {
        acked.push(entry.id)
      }
      // Ack:a även om redan applicerad (idempotent)
      if (!applied && entry.id && !acked.includes(entry.id)) {
        acked.push(entry.id)
      }
    }

    if (acked.length > 0) {
      await kv.set(key, profile)
    }

    return res.status(200).json({
      ok: true,
      ack: acked,
      appliedCount: acked.length
    })
  } catch (error) {
    return res.status(500).json({ error: 'Storage backend unavailable' })
  }
}
