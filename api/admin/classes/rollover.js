import { kv } from '@vercel/kv'
import { applyRolloverAtomically, buildRolloverPlan } from '../../_classRollover.js'
import { validateSchoolId } from '../../_schoolStore.js'
import { getLiveTeacherAuthPayload, withCors } from '../../_helpers.js'
import { hasSchoolScope, isSchoolAdminRole } from '../../_teacherRoles.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Admin access required' })
  if (!isSchoolAdminRole(auth.role, auth.isAdmin)) return res.status(403).json({ error: 'Admin access required' })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const schoolId = await validateSchoolId(req.body?.schoolId)
    if (!schoolId) return res.status(400).json({ error: 'Välj skola för årsbytet.' })
    if (!hasSchoolScope(auth, schoolId)) return res.status(403).json({ error: 'Skolan ligger utanför din behörighet.' })

    const ids = await kv.smembers('classes:index') || []
    const classes = (await Promise.all(ids.map(id => kv.get(`class:${id}`))))
      .filter(record => record?.schoolId === schoolId)
    const generated = buildRolloverPlan(classes, {
      graduatingGrade: req.body?.graduatingGrade,
      exitYear: req.body?.exitYear
    })

    if (req.body?.dryRun !== false) {
      return res.status(200).json({
        ...generated,
        dryRun: true,
        message: generated.changes.length ? undefined : 'Inga klassnamn kunde föreslås automatiskt.'
      })
    }

    const changes = Array.isArray(req.body?.changes) ? req.body.changes : generated.changes
    if (changes.length === 0) return res.status(400).json({ error: 'Det finns inga valda ändringar att genomföra.' })
    const applied = await applyRolloverAtomically(schoolId, classes, changes, req.body?.snapshot || generated.snapshot)
    return res.status(200).json({ ok: true, changes: applied })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Kunde inte genomföra årsbytet.' })
  }
}
