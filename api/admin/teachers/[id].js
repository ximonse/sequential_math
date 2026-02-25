/**
 * GET /api/admin/teachers/:id  — get teacher account
 * PUT /api/admin/teachers/:id  — update (displayName, classIds, isAdmin, password)
 * Both require admin auth.
 */
import { kv } from '@vercel/kv'
import {
  hashTeacherPassword,
  isAdminAuthorized,
  withCors
} from '../../_helpers.js'

function sanitizeAccount(account) {
  if (!account) return null
  const { passwordHash, passwordSalt, passwordScheme, ...rest } = account
  return rest
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,PUT,DELETE,OPTIONS',
    headers: 'Content-Type, x-teacher-token, x-teacher-password'
  })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  const id = String(req.query.id || '').trim()
  if (!id) return res.status(400).json({ error: 'Missing id' })

  const key = `teacher_account:${id}`

  try {
    const account = await kv.get(key)
    if (!account) return res.status(404).json({ error: 'Teacher not found' })

    if (req.method === 'GET') {
      return res.status(200).json({ teacher: sanitizeAccount(account) })
    }

    if (req.method === 'PUT') {
      const updated = { ...account }

      if (typeof req.body?.displayName === 'string') {
        updated.displayName = req.body.displayName.trim() || account.displayName
      }
      if (Array.isArray(req.body?.classIds)) {
        updated.classIds = req.body.classIds.map(String).filter(Boolean)
      }
      if (typeof req.body?.isAdmin === 'boolean') {
        updated.isAdmin = req.body.isAdmin
      }
      if (typeof req.body?.password === 'string' && req.body.password.length >= 6) {
        const { hash, salt, scheme } = hashTeacherPassword(req.body.password)
        updated.passwordHash = hash
        updated.passwordSalt = salt
        updated.passwordScheme = scheme
      }

      updated.updatedAt = Date.now()
      await kv.set(key, updated)
      return res.status(200).json({ ok: true, teacher: sanitizeAccount(updated) })
    }

    if (req.method === 'DELETE') {
      await kv.del(key)
      await kv.srem('teacher_accounts:index', id)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: 'Storage error', details: err?.message })
  }
}
