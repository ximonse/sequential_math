import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload } from './_helpers.js'
import { canManageClass, isSuperAdminRole } from './_teacherRoles.js'
import { studentStoreError } from './_studentStore.js'

export async function canAccessClass(req, classId) {
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth || !classId) return false
  if (await kv.exists(`class_deleted:${classId}`)) return false
  const record = await kv.get(`class:${classId}`)
  if (!record) return false
  return canManageClass(auth, record)
}

export async function assertTeacherStudentAccess(req, profile) {
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) throw studentStoreError(401, 'Teacher authorization required')
  if (isSuperAdminRole(auth.role, auth.isAdmin)) return
  const ids = [...new Set([profile?.classId, ...(profile?.classIds || [])].filter(Boolean))]
  for (const id of ids) {
    if (await canAccessClass(req, id)) return
  }
  throw studentStoreError(403, 'Not authorized for this student')
}

export async function getLiveAuthorizedClassIds(req) {
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return []
  if (isSuperAdminRole(auth.role, auth.isAdmin)) return null
  const ids = await kv.smembers('classes:index')
  const allowed = await Promise.all((ids || []).map(async id => (
    await canAccessClass(req, id) ? id : null
  )))
  return allowed.filter(Boolean)
}
