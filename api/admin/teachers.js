/**
 * GET  /api/admin/teachers  — list all teacher accounts
 * POST /api/admin/teachers  — create a new teacher account
 * Both require admin auth.
 */
import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import {
  hashTeacherPassword,
  isAdminAuthorized,
  withCors
} from '../_helpers.js'

function sanitizeAccount(account) {
  if (!account) return null
  const { passwordHash, passwordSalt, passwordScheme, ...rest } = account
  return rest
}

export default async function handler(req, res) {
  withCors(res, {
    methods: 'GET,POST,OPTIONS',
    headers: 'Content-Type, x-teacher-token, x-teacher-password'
  })
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({ error: 'Admin access required' })
  }

  if (req.method === 'GET') {
    try {
      const ids = await kv.smembers('teacher_accounts:index')
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(200).json({ teachers: [] })
      }
      const accounts = await Promise.all(ids.map(id => kv.get(`teacher_account:${id}`)))
      const teachers = accounts.filter(Boolean).map(sanitizeAccount)
      return res.status(200).json({ teachers })
    } catch (err) {
      return res.status(500).json({ error: 'Storage error', details: err?.message })
    }
  }

  if (req.method === 'POST') {
    const username = String(req.body?.username || '').trim().toLowerCase()
    const displayName = String(req.body?.displayName || req.body?.username || '').trim()
    const password = String(req.body?.password || '')
    const isAdmin = Boolean(req.body?.isAdmin)
    const classIds = Array.isArray(req.body?.classIds) ? req.body.classIds.map(String) : []

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required', code: 'MISSING_FIELDS' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters', code: 'WEAK_PASSWORD' })
    }

    // Check username uniqueness
    const existingIds = await kv.smembers('teacher_accounts:index')
    if (Array.isArray(existingIds) && existingIds.length > 0) {
      const existing = await Promise.all(existingIds.map(id => kv.get(`teacher_account:${id}`)))
      const taken = existing.some(acc => acc && String(acc.username || '').toLowerCase() === username)
      if (taken) {
        return res.status(409).json({ error: 'Username already taken', code: 'USERNAME_TAKEN' })
      }
    }

    const { hash, salt, scheme } = hashTeacherPassword(password)
    const id = randomBytes(8).toString('hex')
    const account = {
      id,
      username,
      displayName: displayName || username,
      passwordHash: hash,
      passwordSalt: salt,
      passwordScheme: scheme,
      classIds,
      isAdmin,
      createdAt: Date.now()
    }

    await kv.set(`teacher_account:${id}`, account)
    await kv.sadd('teacher_accounts:index', id)

    return res.status(201).json({ ok: true, teacher: sanitizeAccount(account) })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
