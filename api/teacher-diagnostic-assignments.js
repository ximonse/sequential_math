import { teacherImageAction } from './_screeningImages.js'
import { teacherDraftAction } from './_screeningDraftStore.js'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { createDiagnosticAssignment, copyDiagnosticAssignment, stopDiagnosticAssignment } from './_diagnosticAssignmentStore.js'
import { freezeStoppedDiagnosticAttempts } from './_diagnosticAssignmentClose.js'
import { diagnosticApiEnabled, diagnosticAssignablePupilsInClass } from './_diagnosticApiAccess.js'
import { listClassDiagnosticAssignments } from './_diagnosticAssignmentList.js'
import { isSchoolAdminRole } from './_teacherRoles.js'
import { diagnosticDispatchOptions } from './_diagnosticDispatchRequest.js'

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,PATCH,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })
  if (!diagnosticApiEnabled()) return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
  try {
    const auth = await getLiveTeacherAuthPayload(req)
    if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })
    if (!isSchoolAdminRole(auth.role, auth.isAdmin)) {
      return res.status(403).json({ error: 'Diagnostic pilot requires admin access' })
    }
    if (req.query?.resource === 'drafts' || req.body?.action === 'save_draft') return await teacherDraftAction(req, res, auth.teacherId)
    const imageAction = ['figures', 'images'].includes(req.query?.resource) || ['upload_image', 'hide_image'].includes(req.body?.action)
    if (imageAction) {
      if (req.query?.assignmentId && (typeof req.query.classId !== 'string' || !await canAccessClass(req, req.query.classId))) {
        return res.status(403).json({ error: 'Not authorized for this class' })
      }
      return await teacherImageAction(req, res, auth.teacherId)
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
    if (req.method === 'PATCH') {
      if (req.body?.status !== 'stopped') return res.status(400).json({ error: 'Only stopping is supported' })
      const assignment = await stopDiagnosticAssignment({ classId,
        assignmentId: req.body?.assignmentId, teacherId: auth.teacherId })
      // Repeating the call retries any answer that could not be handed in.
      const { frozen, failed } = await freezeStoppedDiagnosticAttempts(assignment)
      return res.status(200).json({ assignment, frozen, failed })
    }
    const assignable = await diagnosticAssignablePupilsInClass(classId)
    const studentIds = req.body?.audience === 'class'
      ? await diagnosticAssignablePupilsInClass(classId, { wholeClass: true }) : req.body?.studentIds
    if (!Array.isArray(studentIds) || !studentIds.length
      || !studentIds.every(studentId => assignable.includes(studentId))) {
      return res.status(403).json({ error: 'Only pupils in this class can be assigned' })
    }
    const dispatchOptions = diagnosticDispatchOptions({ ...req.body, studentIds }, auth.teacherId)
    if (req.body?.sourceAssignmentId !== undefined) {
      if (typeof req.body.sourceClassId !== 'string' || !await canAccessClass(req, req.body.sourceClassId)) {
        return res.status(403).json({ error: 'Not authorized for the source class' })
      }
      const assignment = await copyDiagnosticAssignment({ classId, studentIds, teacherId: auth.teacherId,
        sourceClassId: req.body.sourceClassId, sourceAssignmentId: req.body.sourceAssignmentId,
        titleSv: req.body.titleSv }, ...(req.body.requestId === undefined ? [] : [dispatchOptions]))
      return res.status(201).json({ assignment })
    }
    const assignment = await createDiagnosticAssignment({ classId,
      studentIds, taskIds: req.body?.taskIds, teacherId: auth.teacherId,
      titleSv: req.body?.titleSv, itemOptions: req.body?.itemOptions, customTasks: req.body?.customTasks }, ...(req.body.requestId === undefined ? [] : [dispatchOptions]))
    return res.status(201).json({ assignment })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Diagnostic storage unavailable', code: error.code })
  }
}
