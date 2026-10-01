import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { createDiagnosticAssignment } from './_diagnosticAssignmentStore.js'
import { diagnosticApiEnabled, diagnosticTestStudentAllowed, diagnosticTestStudentsInClass } from './_diagnosticApiAccess.js'
import { listClassDiagnosticAssignments } from './_diagnosticAssignmentList.js'
import { isSchoolAdminRole } from './_teacherRoles.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!diagnosticApiEnabled()) return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
  try {
    const auth = await getLiveTeacherAuthPayload(req)
    if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })
    if (!isSchoolAdminRole(auth.role, auth.isAdmin)) {
      return res.status(403).json({ error: 'Diagnostic pilot requires admin access' })
    }
    const classId = req.method === 'GET' ? req.query?.classId : req.body?.classId
    if (typeof classId !== 'string' || !await canAccessClass(req, classId)) {
      return res.status(403).json({ error: 'Not authorized for this class' })
    }
    if (req.method === 'GET') {
      const assignments = await listClassDiagnosticAssignments(classId)
      return res.status(200).json({ assignments, testStudentIds: await diagnosticTestStudentsInClass(classId) })
    }
    if (!Array.isArray(req.body?.studentIds) || !req.body.studentIds.length
      || !req.body.studentIds.every(diagnosticTestStudentAllowed)) {
      return res.status(403).json({ error: 'Only configured diagnostic test accounts are allowed' })
    }
    const assignment = await createDiagnosticAssignment({ classId,
      studentIds: req.body?.studentIds, taskIds: req.body?.taskIds, teacherId: auth.teacherId })
    return res.status(201).json({ assignment })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Diagnostic storage unavailable', code: error.code })
  }
}
