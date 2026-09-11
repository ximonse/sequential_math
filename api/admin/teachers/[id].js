import { kv } from '@vercel/kv'
import { validateSchoolId } from '../../_schoolStore.js'
import { getLiveTeacherAuthPayload, hashTeacherPassword, withCors } from '../../_helpers.js'
import { revalidateGroupsForTeacher } from '../../_groupStore.js'
import {
  SCHOOL_ADMIN_ROLE,
  SUPER_ADMIN_ROLE,
  TEACHER_ROLE,
  hasSchoolScope,
  isSchoolAdminRole,
  isSuperAdminRole,
  normalizeTeacherRole
} from '../../_teacherRoles.js'

function sanitizeAccount(account) {
  if (!account) return null
  const { passwordHash, passwordSalt, passwordScheme, isAdmin, ...rest } = account
  return { ...rest, role: normalizeTeacherRole(account.role, account.isAdmin) }
}

async function activeSuperAdminCount() {
  const ids = await kv.smembers('teacher_accounts:index') || []
  const accounts = await Promise.all(ids.map(id => kv.get(`teacher_account:${id}`)))
  return accounts.filter(account => account && account.disabled !== true
    && normalizeTeacherRole(account.role, account.isAdmin) === SUPER_ADMIN_ROLE).length
}

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,PUT,DELETE,OPTIONS', headers: 'Content-Type, x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Admin access required' })
  if (!isSchoolAdminRole(auth.role, auth.isAdmin)) return res.status(403).json({ error: 'Admin access required' })

  const id = String(req.query.id || '').trim()
  if (!id) return res.status(400).json({ error: 'Missing id' })

  try {
    const key = `teacher_account:${id}`
    const account = await kv.get(key)
    if (!account) return res.status(404).json({ error: 'Teacher not found' })
    const currentRole = normalizeTeacherRole(account.role, account.isAdmin)
    const accountSchools = Array.isArray(account.schoolIds) ? account.schoolIds.map(String) : []
    const isGlobal = isSuperAdminRole(auth.role)
    const hasAnyScope = accountSchools.some(schoolId => hasSchoolScope(auth, schoolId))
    if (!isGlobal && (currentRole !== TEACHER_ROLE || !hasAnyScope)) {
      return res.status(403).json({ error: 'Läraren ligger utanför din administratörsbehörighet.' })
    }

    if (req.method === 'GET') return res.status(200).json({ teacher: sanitizeAccount(account) })

    if (req.method === 'DELETE') {
      if (!isGlobal) return res.status(403).json({ error: 'Endast superadmin kan radera lärarkonton.' })
      if (id === auth.teacherId) return res.status(409).json({ error: 'Du kan inte radera ditt eget konto.' })
      if (currentRole === SUPER_ADMIN_ROLE && await activeSuperAdminCount() <= 1) {
        return res.status(409).json({ error: 'Den sista superadminen kan inte raderas.' })
      }
      await kv.del(key)
      await kv.srem('teacher_accounts:index', id)
      return res.status(200).json({ ok: true })
    }

    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })
    const updated = { ...account, role: currentRole }
    let shouldRevokeSessions = false

    if (typeof req.body?.displayName === 'string') updated.displayName = req.body.displayName.trim() || account.displayName

    if (Array.isArray(req.body?.schoolIds)) {
      const requested = [...new Set((await Promise.all(req.body.schoolIds.map(validateSchoolId))).filter(Boolean))]
      if (isGlobal) updated.schoolIds = requested
      else {
        if (requested.some(schoolId => !hasSchoolScope(auth, schoolId))) {
          return res.status(403).json({ error: 'Du kan bara tilldela dina egna skolor.' })
        }
        const preserved = accountSchools.filter(schoolId => !hasSchoolScope(auth, schoolId))
        updated.schoolIds = [...new Set([...preserved, ...requested])]
      }
      const classIds = await kv.smembers('classes:index') || []
      const classes = await Promise.all(classIds.map(classId => kv.get(`class:${classId}`)))
      const assignedOutsideSchool = classes.some(record => record && (record.teacherIds || []).includes(id)
        && record.schoolId && !updated.schoolIds.includes(record.schoolId))
      if (assignedOutsideSchool) return res.status(400).json({ error: 'Flytta eller avkoppla lärarens klasser innan skolans tilldelning tas bort.' })
      shouldRevokeSessions = true
    }

    if (req.body?.role !== undefined || req.body?.isAdmin !== undefined) {
      if (!isGlobal) return res.status(403).json({ error: 'Endast superadmin kan ändra roller.' })
      const nextRole = normalizeTeacherRole(req.body?.role, req.body?.isAdmin)
      if (id === auth.teacherId && nextRole !== SUPER_ADMIN_ROLE) {
        return res.status(409).json({ error: 'Du kan inte ta bort din egen superadminroll.' })
      }
      if (currentRole === SUPER_ADMIN_ROLE && nextRole !== SUPER_ADMIN_ROLE && await activeSuperAdminCount() <= 1) {
        return res.status(409).json({ error: 'Den sista superadminen kan inte nedgraderas.' })
      }
      updated.role = nextRole
      shouldRevokeSessions = true
    }

    if (typeof req.body?.password === 'string') {
      if (req.body.password.length < 6) return res.status(400).json({ error: 'Lösenordet måste ha minst 6 tecken.' })
      if (!isGlobal && !accountSchools.every(schoolId => hasSchoolScope(auth, schoolId))) {
        return res.status(403).json({ error: 'Läraren tillhör en skola utanför din behörighet; lösenordet kräver superadmin.' })
      }
      const { hash, salt, scheme } = hashTeacherPassword(req.body.password)
      updated.passwordHash = hash
      updated.passwordSalt = salt
      updated.passwordScheme = scheme
      shouldRevokeSessions = true
    }

    updated.disabled = updated.role === SCHOOL_ADMIN_ROLE && (updated.schoolIds || []).length === 0
    if (id === auth.teacherId && updated.disabled) return res.status(409).json({ error: 'Du kan inte spärra ditt eget konto.' })
    if (shouldRevokeSessions) updated.sessionVersion = Math.max(1, Number(account.sessionVersion) || 1) + 1
    updated.updatedAt = Date.now()
    delete updated.isAdmin
    await kv.set(key, updated)
    if (shouldRevokeSessions) await revalidateGroupsForTeacher(id, updated)
    return res.status(200).json({ ok: true, teacher: sanitizeAccount(updated) })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage error' })
  }
}
