import { kv } from '@vercel/kv'
import { mutateStudentRecord, studentStoreError } from '../../_studentStore.js'
import { assertTeacherStudentAccess, canAccessClass } from '../../_studentAccess.js'
import { getLiveTeacherAuthPayload, withCors } from '../../_helpers.js'
import { revalidateGroupsForPupil } from '../../_groupStore.js'
import { isSuperAdminRole } from '../../_teacherRoles.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'PUT,OPTIONS', headers: 'Content-Type, x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })
  const studentId = String(req.query?.studentId || '').trim().toUpperCase()
  const fromClassId = String(req.body?.fromClassId || '').trim()
  const toClassId = String(req.body?.toClassId || '').trim()
  if (!studentId || !fromClassId || !toClassId || fromClassId === toClassId) {
    return res.status(400).json({ error: 'Välj olika käll- och målklasser.' })
  }
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })

  try {
    const [source, target] = await Promise.all([
      kv.get(`class:${fromClassId}`),
      kv.get(`class:${toClassId}`)
    ])
    if (!source || !target || !await canAccessClass(req, toClassId) || !await canAccessClass(req, fromClassId)) {
      throw studentStoreError(403, 'Not authorized for class move')
    }
    if (!isSuperAdminRole(auth.role, auth.isAdmin) && String(source.schoolId || '') !== String(target.schoolId || '')) {
      throw studentStoreError(403, 'Endast superadmin kan flytta elever mellan skolor.')
    }

    const saved = await mutateStudentRecord(studentId, async current => {
      if (!current) throw studentStoreError(404, 'Student not found')
      await assertTeacherStudentAccess(req, current)
      const memberships = [...new Set([current.classId, ...(current.classIds || [])].filter(Boolean))]
      if (!memberships.includes(fromClassId)) throw studentStoreError(409, 'Student is not in the selected source class')
      const classIds = [...new Set([...memberships.filter(id => id !== fromClassId), toClassId])]
      const classId = current.classId === fromClassId ? toClassId : current.classId
      return { ...current, classIds, classId, className: classId === toClassId ? target.name : current.className }
    })
    await revalidateGroupsForPupil(studentId)
    return res.status(200).json({ ok: true, profile: {
      studentId: saved.studentId,
      classId: saved.classId,
      classIds: saved.classIds
    } })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte flytta eleven.' })
  }
}
