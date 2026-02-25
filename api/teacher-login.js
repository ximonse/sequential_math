/**
 * POST /api/teacher-login
 * Body: { username, password }
 * Returns: { ok, token, expiresAt, teacherId, displayName, classIds, isAdmin }
 *
 * Supports two modes:
 * 1. Per-teacher accounts stored in KV (teacher_account:{id})
 * 2. Legacy admin: username == "admin" + TEACHER_API_PASSWORD (backward compat)
 */
import { kv } from '@vercel/kv'
import {
  createTeacherSessionToken,
  getConfiguredTeacherApiPassword,
  isProdLikeServer,
  secureCompare,
  verifyTeacherPassword,
  withCors
} from './_helpers.js'

async function findTeacherByUsername(username) {
  const normalized = String(username || '').trim().toLowerCase()
  if (!normalized) return null
  try {
    const ids = await kv.smembers('teacher_accounts:index')
    if (!Array.isArray(ids) || ids.length === 0) return null
    const accounts = await Promise.all(
      ids.map(id => kv.get(`teacher_account:${id}`))
    )
    return accounts.find(
      acc => acc && String(acc.username || '').toLowerCase() === normalized
    ) || null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'POST,OPTIONS',
    headers: 'Content-Type'
  })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password', code: 'MISSING_CREDENTIALS' })
  }

  // 1. Try per-teacher account from KV
  const account = await findTeacherByUsername(username)
  if (account) {
    const valid = verifyTeacherPassword(password, account.passwordHash, account.passwordSalt)
    if (!valid) {
      return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_PASSWORD' })
    }

    const classIds = Array.isArray(account.classIds) ? account.classIds : []
    const session = createTeacherSessionToken({
      teacherId: account.id,
      classIds,
      isAdmin: Boolean(account.isAdmin)
    })
    if (!session) {
      return res.status(500).json({ error: 'Could not create session token', code: 'TOKEN_ERROR' })
    }

    return res.status(200).json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      teacherId: account.id,
      displayName: account.displayName || account.username,
      classIds,
      isAdmin: Boolean(account.isAdmin)
    })
  }

  // 2. Legacy admin fallback: username "admin" + env password
  const adminPassword = getConfiguredTeacherApiPassword()
  const isLegacyAdmin = username.toLowerCase() === 'admin'
    && adminPassword !== ''
    && secureCompare(password, adminPassword)

  if (isLegacyAdmin) {
    const session = createTeacherSessionToken({ isAdmin: true })
    if (!session) {
      return res.status(500).json({ error: 'Could not create session token', code: 'TOKEN_ERROR' })
    }
    return res.status(200).json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      teacherId: null,
      displayName: 'Admin',
      classIds: [],
      isAdmin: true
    })
  }

  // Dev fallback (no password configured, not prod)
  if (!adminPassword && !isProdLikeServer()) {
    const session = createTeacherSessionToken({ isAdmin: true })
    return res.status(200).json({
      ok: true,
      token: session?.token || '',
      expiresAt: session?.expiresAt || null,
      teacherId: null,
      displayName: 'Dev Admin',
      classIds: [],
      isAdmin: true,
      devFallback: true
    })
  }

  return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_PASSWORD' })
}
