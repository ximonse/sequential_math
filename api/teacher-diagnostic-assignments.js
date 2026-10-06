import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { createDiagnosticAssignment } from './_diagnosticAssignmentStore.js'
import { diagnosticApiEnabled, diagnosticAssignablePupilsInClass } from './_diagnosticApiAccess.js'
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
      const allowed = await diagnosticAssignablePupilsInClass(classId)
      const roster = await diagnosticAssignablePupilsInClass(classId, { wholeClass: true })
      return res.status(200).json({ assignments, testStudentIds: allowed,
        classStudentCount: roster.length, wholeClassAvailable: roster.length > 0 && roster.every(id => allowed.includes(id)) })
    }
    const assignable = await diagnosticAssignablePupilsInClass(classId)
    const studentIds = req.body?.audience === 'class'
      ? await diagnosticAssignablePupilsInClass(classId, { wholeClass: true }) : req.body?.studentIds
    if (!Array.isArray(studentIds) || !studentIds.length
      || !studentIds.every(studentId => assignable.includes(studentId))) {
      return res.status(403).json({ error: 'Only pupils in this class can be assigned' })
    }
    const assignment = await createDiagnosticAssignment({ classId,
      studentIds, taskIds: req.body?.taskIds, teacherId: auth.teacherId })
    return res.status(201).json({ assignment })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Diagnostic storage unavailable', code: error.code })
  }
}
