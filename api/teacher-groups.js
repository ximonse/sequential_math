import { randomBytes } from 'node:crypto'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import {
  assertAuthCanUseMembers,
  assertGroupCanBeShared,
  authCanManageGroup,
  createGroupRecord,
  deleteGroupRecord,
  getGroupMemberContext,
  listGroupRecords,
  listGroupTeacherCandidates,
  mutateGroupRecord
} from './_groupStore.js'
import { studentStoreError } from './_studentStore.js'

const uniqueIds = values => [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))]

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,PUT,DELETE,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })

  try {
    if (req.method === 'GET') {
      const groups = (await listGroupRecords()).filter(group => authCanManageGroup(auth, group))
      const teachers = await listGroupTeacherCandidates(auth, groups)
      return res.status(200).json({ groups, teachers })
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim()
      if (!name) throw studentStoreError(400, 'Ange gruppnamn.')
      const context = await getGroupMemberContext(req.body?.pupilIds, req.body?.schoolId)
      assertAuthCanUseMembers(auth, context)
      const requestedTeachers = uniqueIds(req.body?.teacherIds)
      const teacherIds = uniqueIds([...(requestedTeachers.length ? requestedTeachers : [auth.teacherId]), auth.teacherId])
      await assertGroupCanBeShared(teacherIds, context)
      const group = await createGroupRecord({
        id: `group_${randomBytes(8).toString('hex')}`,
        name,
        schoolId: context.schoolId,
        pupilIds: context.pupilIds,
        teacherIds,
        createdBy: auth.teacherId
      })
      return res.status(201).json({ ok: true, group })
    }

    const id = String(req.query?.id || req.body?.id || '').trim()
    if (!id) throw studentStoreError(400, 'Grupp-ID saknas.')
    const current = (await listGroupRecords()).find(group => group.id === id)
    if (!current) throw studentStoreError(404, 'Gruppen finns inte.')
    if (!authCanManageGroup(auth, current)) throw studentStoreError(403, 'Du får inte ändra den här gruppen.')

    if (req.method === 'PUT') {
      const pupilIds = req.body?.pupilIds === undefined ? current.pupilIds : req.body.pupilIds
      const context = await getGroupMemberContext(pupilIds, current.schoolId)
      assertAuthCanUseMembers(auth, context)
      const teacherIds = req.body?.teacherIds === undefined ? current.teacherIds : uniqueIds(req.body.teacherIds)
      await assertGroupCanBeShared(teacherIds, context)
      const group = await mutateGroupRecord(id, latest => {
        if (!latest) throw studentStoreError(404, 'Gruppen finns inte.')
        return {
          ...latest,
          name: req.body?.name === undefined ? latest.name : String(req.body.name || '').trim(),
          pupilIds: context.pupilIds,
          teacherIds,
          updatedAt: Date.now()
        }
      })
      return res.status(200).json({ ok: true, group })
    }

    if (req.method === 'DELETE') {
      await deleteGroupRecord(id)
      return res.status(200).json({ ok: true })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte hantera gruppen.' })
  }
}
