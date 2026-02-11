import { kv } from '@vercel/kv'
import { createHash, randomBytes } from 'node:crypto'

const PASSWORD_SCHEME = 'sha256-v1'

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-student-password, x-teacher-password')
}

function getConfiguredTeacherApiPassword() {
  const explicit = process.env.TEACHER_API_PASSWORD
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  return ''
}

function isProdLikeServer() {
  const env = String(process.env.VERCEL_ENV || process.env.NODE_ENV || '').toLowerCase()
  return env === 'production' || env === 'preview'
}

function isTeacherApiAuthorized(req) {
  const configured = getConfiguredTeacherApiPassword()
  if (!configured) return !isProdLikeServer()
  const provided = String(req.headers['x-teacher-password'] || '')
  return provided === configured
}

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

export default async function handler(req, res) {
  withCors(res)
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

      if (existingMigrated) {
        if (!teacherAuthorized && !verifyPasswordAgainstAuth(existingMigrated.auth, studentPassword)) {
          return res.status(401).json({ error: 'Unauthorized' })
        }
      } else if (!teacherAuthorized && studentPassword.trim() === '') {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const normalized = normalizeProfileForStorage(profile, studentId, studentPassword)
      await kv.set(key, normalized)

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
