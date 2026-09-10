/**
 * GET /api/admin/teachers/:id  — get teacher account
 * PUT /api/admin/teachers/:id  — update (displayName, classIds, isAdmin, password)
 * Both require admin auth.
 */
import { kv } from '@vercel/kv'
import { validateSchoolId } from '../../_schoolStore.js'
import {
  hashTeacherPassword,
  isLiveAdminAuthorized,
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
    headers: 'Content-Type, x-teacher-token'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!await isLiveAdminAuthorized(req)) {
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
      let shouldRevokeSessions = false

      if (typeof req.body?.displayName === 'string') {
        updated.displayName = req.body.displayName.trim() || account.displayName
      }
      if (Array.isArray(req.body?.schoolIds)) {
        const schoolIds = [...new Set((await Promise.all(req.body.schoolIds.map(validateSchoolId))).filter(Boolean))]
        const classIds = await kv.smembers('classes:index') || []
        const classes = await Promise.all(classIds.map(classId => kv.get(`class:${classId}`)))
        const assignedOutsideSchool = classes.some(classRecord => (
          classRecord && Array.isArray(classRecord.teacherIds) && classRecord.teacherIds.includes(id)
            && classRecord.schoolId && !schoolIds.includes(classRecord.schoolId)
        ))
        if (assignedOutsideSchool) return res.status(400).json({ error: 'Flytta eller avkoppla lärarens klasser innan skolans tilldelning tas bort.' })
        updated.schoolIds = schoolIds
        shouldRevokeSessions = true
      }
      if (typeof req.body?.isAdmin === 'boolean') {
        updated.isAdmin = req.body.isAdmin
        shouldRevokeSessions = true
      }
      if (typeof req.body?.password === 'string' && req.body.password.length >= 6) {
        const { hash, salt, scheme } = hashTeacherPassword(req.body.password)
        updated.passwordHash = hash
        updated.passwordSalt = salt
        updated.passwordScheme = scheme
        shouldRevokeSessions = true
      }

      if (shouldRevokeSessions) updated.sessionVersion = Math.max(1, Number(account.sessionVersion) || 1) + 1
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
