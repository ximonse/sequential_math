import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { createDiagnosticAssignment } from './_diagnosticAssignmentStore.js'
import { diagnosticApiEnabled } from './_diagnosticApiAccess.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!diagnosticApiEnabled()) return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
  try {
    const auth = await getLiveTeacherAuthPayload(req)
    if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })
    const classId = req.body?.classId
    if (typeof classId !== 'string' || !await canAccessClass(req, classId)) {
      return res.status(403).json({ error: 'Not authorized for this class' })
    }
    const assignment = await createDiagnosticAssignment({ classId,
      studentIds: req.body?.studentIds, taskIds: req.body?.taskIds, teacherId: auth.teacherId })
    return res.status(201).json({ assignment })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Diagnostic storage unavailable', code: error.code })
  }
}
