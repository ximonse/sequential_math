import { kv } from '@vercel/kv'
import { assertTeachersBelongToSchool, validateSchoolId } from '../../_schoolStore.js'
import { archiveClassRecord, deleteClassRecord, mutateClassRecord, restoreClassRecord } from '../../_classStore.js'
import { getLiveTeacherAuthPayload, withCors } from '../../_helpers.js'
import { revalidateGroupsForTeacher } from '../../_groupStore.js'
import { studentStoreError } from '../../_studentStore.js'
import { hasSchoolScope, isSchoolAdminRole, isSuperAdminRole } from '../../_teacherRoles.js'

async function syncTeacherAssignments(classId, beforeIds, afterIds) {
  const affected = [...new Set([...beforeIds, ...afterIds])]
  await Promise.all(affected.map(async teacherId => {
    const account = await kv.get(`teacher_account:${teacherId}`)
    if (!account) return
    const classIds = new Set(account.classIds || [])
    if (afterIds.includes(teacherId)) classIds.add(classId)
    else classIds.delete(classId)
    const updated = {
      ...account,
      classIds: [...classIds],
      sessionVersion: Math.max(1, Number(account.sessionVersion) || 1) + 1,
      updatedAt: Date.now()
    }
    await kv.set(`teacher_account:${teacherId}`, updated)
    await revalidateGroupsForTeacher(teacherId, updated)
  }))
}

async function classHasPupils(classId) {
  const pupilIds = await kv.smembers('students:index') || []
  const pupils = await Promise.all(pupilIds.map(id => kv.get(`student:${String(id).toUpperCase()}`)))
  return pupils.some(profile => profile && [profile.classId, ...(profile.classIds || [])].includes(classId))
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
    const classRecord = await kv.get(`class:${id}`)
    if (!classRecord && req.method !== 'DELETE') return res.status(404).json({ error: 'Class not found' })
    if (classRecord && !hasSchoolScope(auth, classRecord.schoolId)) {
      return res.status(403).json({ error: 'Klassen ligger utanför din behörighet.' })
    }

    if (req.method === 'GET') return res.status(200).json({ class: classRecord })

    if (req.method === 'DELETE') {
      if (!isSuperAdminRole(auth.role)) return res.status(403).json({ error: 'Endast superadmin kan radera klasser permanent.' })
      if (!classRecord?.archived) return res.status(409).json({ error: 'Klassen måste vara arkiverad före permanent radering.' })
      if (await classHasPupils(id)) return res.status(409).json({ error: 'Flytta eller radera eleverna innan klassen raderas permanent.' })
      await deleteClassRecord(id)
      return res.status(200).json({ ok: true })
    }

    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })
    if (req.body?.archive === true) {
      const archived = await archiveClassRecord(id, req.body?.archivedName)
      return res.status(200).json({ ok: true, class: archived })
    }
    if (req.body?.restore === true) {
      const restored = await restoreClassRecord(id, req.body?.name)
      return res.status(200).json({ ok: true, class: restored })
    }

    const updated = { ...classRecord }
    if (req.body?.schoolId !== undefined) {
      const targetSchoolId = await validateSchoolId(req.body.schoolId)
      if (!hasSchoolScope(auth, targetSchoolId)) return res.status(403).json({ error: 'Målskolan ligger utanför din behörighet.' })
      updated.schoolId = targetSchoolId
    }
    if (typeof req.body?.name === 'string' && req.body.name.trim()) updated.name = req.body.name.trim()
    if (Array.isArray(req.body?.teacherIds)) updated.teacherIds = [...new Set(req.body.teacherIds.map(String).filter(Boolean))]
    await assertTeachersBelongToSchool(updated.teacherIds || [], updated.schoolId)
    if (Array.isArray(req.body?.enabledExtras)) updated.enabledExtras = req.body.enabledExtras.map(String).filter(Boolean)
    updated.updatedAt = Date.now()

    const saved = await mutateClassRecord(id, current => {
      if (!current) throw studentStoreError(404, 'Class not found')
      if (Number(current.serverRevision || 0) !== Number(classRecord.serverRevision || 0)) {
        throw studentStoreError(409, 'Class changed; reload before saving')
      }
      return updated
    })
    const oldTeacherIds = Array.isArray(classRecord.teacherIds) ? classRecord.teacherIds : []
    const newTeacherIds = Array.isArray(saved.teacherIds) ? saved.teacherIds : []
    if (oldTeacherIds.some(id => !newTeacherIds.includes(id)) || newTeacherIds.some(id => !oldTeacherIds.includes(id))) {
      await syncTeacherAssignments(id, oldTeacherIds, newTeacherIds)
    }
    return res.status(200).json({ ok: true, class: saved })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage error' })
  }
}
