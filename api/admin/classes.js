import { kv } from '@vercel/kv'
import { randomBytes } from 'node:crypto'
import { createClassRecord } from '../_classStore.js'
import { createClassLoginToken } from '../_studentSession.js'
import { assertTeachersBelongToSchool, validateSchoolId } from '../_schoolStore.js'
import { getLiveTeacherAuthPayload, withCors } from '../_helpers.js'
import { hasSchoolScope, isSchoolAdminRole } from '../_teacherRoles.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type, x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Admin access required' })
  if (!isSchoolAdminRole(auth.role, auth.isAdmin)) return res.status(403).json({ error: 'Admin access required' })

  try {
    const ids = await kv.smembers('classes:index') || []
    const records = (await Promise.all(ids.map(id => kv.get(`class:${id}`)))).filter(Boolean)

    if (req.method === 'GET') {
      return res.status(200).json({ classes: records.filter(record => hasSchoolScope(auth, record.schoolId)) })
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim()
      if (!name) return res.status(400).json({ error: 'name required', code: 'MISSING_NAME' })
      const teacherIds = Array.isArray(req.body?.teacherIds) ? req.body.teacherIds.map(String).filter(Boolean) : []
      const schoolId = await validateSchoolId(req.body?.schoolId)
      if (!schoolId) return res.status(400).json({ error: 'Välj en skola för klassen.' })
      if (!hasSchoolScope(auth, schoolId)) return res.status(403).json({ error: 'Skolan ligger utanför din behörighet.' })
      await assertTeachersBelongToSchool(teacherIds, schoolId)

      const id = randomBytes(6).toString('hex')
      const classRecord = {
        id,
        name,
        teacherIds,
        schoolId,
        enabledExtras: Array.isArray(req.body?.enabledExtras) ? req.body.enabledExtras.map(String) : [],
        loginToken: createClassLoginToken(),
        createdAt: Date.now()
      }
      const saved = await createClassRecord(classRecord)
      await Promise.all(teacherIds.map(async teacherId => {
        const account = await kv.get(`teacher_account:${teacherId}`)
        if (!account) return
        await kv.set(`teacher_account:${teacherId}`, {
          ...account,
          classIds: [...new Set([...(account.classIds || []), id])],
          sessionVersion: Math.max(1, Number(account.sessionVersion) || 1) + 1,
          updatedAt: Date.now()
        })
      }))
      return res.status(201).json({ ok: true, class: saved })
    }
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Storage error' })
  }
}
