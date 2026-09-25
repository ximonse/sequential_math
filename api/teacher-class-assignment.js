/**
 * PUT /api/teacher-class-assignment
 * Body: { classId, assignmentPayload } — sets the class's active assignment
 * ("Aktivera för alla"); an empty payload clears it. Pupils read it through
 * GET /api/class-config. Requires teacher auth.
 */
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { mutateClassRecord } from './_classStore.js'
import { studentStoreError } from './_studentStore.js'
import { decodeAssignmentPayload, encodeAssignmentPayload } from '../src/lib/assignments.js'

export default async function handler(req, res) {
  withCors(res, {
    methods: 'PUT,OPTIONS',
    headers: 'Content-Type, x-teacher-token'
  }, req)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' })

  const auth = await getLiveTeacherAuthPayload(req)
  if (!auth) return res.status(401).json({ error: 'Unauthorized' })

  const classId = String(req.body?.classId || '').trim()
  if (!classId) return res.status(400).json({ error: 'classId required' })
  if (!await canAccessClass(req, classId)) return res.status(403).json({ error: 'Not authorized for this class' })

  const rawPayload = String(req.body?.assignmentPayload || '').trim()
  // Re-encode through the shared normaliser so only known fields are stored.
  const assignment = rawPayload ? decodeAssignmentPayload(rawPayload) : null
  if (rawPayload && !assignment) return res.status(400).json({ error: 'Ogiltigt uppdrag.' })
  const activeAssignmentPayload = assignment ? encodeAssignmentPayload(assignment) : ''

  try {
    await mutateClassRecord(classId, current => {
      if (!current) throw studentStoreError(404, 'Class not found')
      return { ...current, activeAssignmentPayload: activeAssignmentPayload || null }
    }, { skipClassNameCheck: true })
    return res.status(200).json({ ok: true, activeAssignmentPayload })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to save' })
  }
}
