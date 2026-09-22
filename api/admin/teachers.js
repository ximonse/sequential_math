import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import { validateSchoolId } from '../_schoolStore.js'
import { getLiveTeacherAuthPayload, hashTeacherPassword, withCors } from '../_helpers.js'
import {
  SCHOOL_ADMIN_ROLE,
  SUPER_ADMIN_ROLE,
  TEACHER_ROLE,
  hasSchoolScope,
  isSchoolAdminRole,
  isSuperAdminRole,
  normalizeTeacherRole
} from '../_teacherRoles.js'

function sanitizeAccount(account) {
  if (!account) return null
  const { passwordHash, passwordSalt, passwordScheme, isAdmin, ...rest } = account
  return { ...rest, role: normalizeTeacherRole(account.role, account.isAdmin) }
}

function visibleToAdmin(auth, account) {
  if (isSuperAdminRole(auth.role)) return true
  if (normalizeTeacherRole(account.role, account.isAdmin) !== TEACHER_ROLE) return false
  return (account.schoolIds || []).some(schoolId => hasSchoolScope(auth, schoolId))
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type, x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Admin access required' })
  if (!isSchoolAdminRole(auth.role, auth.isAdmin)) return res.status(403).json({ error: 'Admin access required' })

  try {
    const ids = await kv.smembers('teacher_accounts:index') || []
    const accounts = (await Promise.all(ids.map(id => kv.get(`teacher_account:${id}`)))).filter(Boolean)

    if (req.method === 'GET') {
      return res.status(200).json({ teachers: accounts.filter(account => visibleToAdmin(auth, account)).map(sanitizeAccount) })
    }

    if (req.method === 'POST') {
      const username = String(req.body?.username || '').trim().toLowerCase()
      const displayName = String(req.body?.displayName || req.body?.username || '').trim()
      const password = String(req.body?.password || '')
      if (!username || !password) return res.status(400).json({ error: 'username and password required', code: 'MISSING_FIELDS' })
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters', code: 'WEAK_PASSWORD' })
      if (accounts.some(account => String(account.username || '').toLowerCase() === username)) {
        return res.status(409).json({ error: 'Username already taken', code: 'USERNAME_TAKEN' })
      }

      const schoolIds = [...new Set((Array.isArray(req.body?.schoolIds)
        ? await Promise.all(req.body.schoolIds.map(validateSchoolId))
        : []).filter(Boolean))]
      if (!isSuperAdminRole(auth.role) && (schoolIds.length === 0 || schoolIds.some(id => !hasSchoolScope(auth, id)))) {
        return res.status(403).json({ error: 'Skoladmin kan bara skapa lärare på sina tilldelade skolor.' })
      }
      const requestedRole = normalizeTeacherRole(req.body?.role, req.body?.isAdmin)
      const role = isSuperAdminRole(auth.role) ? requestedRole : TEACHER_ROLE
      if (![TEACHER_ROLE, SCHOOL_ADMIN_ROLE, SUPER_ADMIN_ROLE].includes(role)) {
        return res.status(400).json({ error: 'Ogiltig roll.' })
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
        classIds: [],
        schoolIds,
        role,
        disabled: role === SCHOOL_ADMIN_ROLE && schoolIds.length === 0,
        sessionVersion: 1,
        createdAt: Date.now()
      }
      await kv.set(`teacher_account:${id}`, account)
      await kv.sadd('teacher_accounts:index', id)
      return res.status(201).json({ ok: true, teacher: sanitizeAccount(account) })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage error' })
  }
}
