import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { isSchoolAdminRole } from './_teacherRoles.js'
import { diagnosticApiEnabled, diagnosticTestStudentsInClass } from './_diagnosticApiAccess.js'
import { listClassDiagnosticAssignments } from './_diagnosticAssignmentList.js'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { summarizeDiagnosticObservation } from '../src/domains/arithmetic/diagnosticObservation.js'
import { analyzeDiagnosticColumnAlignment } from '../src/domains/arithmetic/diagnosticColumnAlignment.js'

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,OPTIONS', headers: 'x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!diagnosticApiEnabled()) return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
  try {
    const auth = await getLiveTeacherAuthPayload(req)
    if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })
    if (!isSchoolAdminRole(auth.role, auth.isAdmin)) {
      return res.status(403).json({ error: 'Diagnostic pilot requires admin access' })
    }
    const { classId, studentId, assignmentId, attemptId } = req.query || {}
    if (![classId, studentId, assignmentId].every(validId)
      || (attemptId !== undefined && !validId(attemptId))) {
      return res.status(400).json({ error: 'Invalid diagnostic identity' })
    }
    if (!await canAccessClass(req, classId)
      || !(await diagnosticTestStudentsInClass(classId)).includes(studentId)) {
      return res.status(403).json({ error: 'Not authorized for this pupil and class' })
    }
    const assignment = (await listClassDiagnosticAssignments(classId))
      .find(item => item.assignmentId === assignmentId && item.studentIds?.includes(studentId))
    if (!assignment) return res.status(404).json({ error: 'Diagnostic assignment not found' })
    const ids = await kv.smembers(`diagnostic_attempts_by_assignment:${assignmentId}`) || []
    const records = await Promise.all(ids.filter(validId).map(id => kv.get(`diagnostic_attempt:${id}`)))
    const attempts = records.filter(record => record?.studentId === studentId
      && record.assignmentId === assignmentId && record.classIdAtAttempt === classId
      && record.evidenceClass === 'diagnostic_only')
    if (attemptId === undefined) {
      return res.status(200).json({ attempts: attempts.map(record => ({ attemptId: record.attemptId,
        assignmentItemId: record.assignmentItemId, taskId: record.taskId,
        taskVersion: record.taskVersion, status: record.status,
        serverRevision: record.serverRevision, lastSequence: record.lastSequence })) })
    }
    const record = attempts.find(item => item.attemptId === attemptId)
    if (!record) return res.status(404).json({ error: 'Diagnostic attempt not found' })
    const item = assignment.items.find(candidate => candidate.assignmentItemId === record.assignmentItemId
      && candidate.taskId === record.taskId && candidate.taskVersion === record.taskVersion)
    if (!item) return res.status(409).json({ error: 'Diagnostic task version mismatch' })
    const saved = await readDiagnosticAttempt(attemptId)
    if (!saved || saved.record.studentId !== studentId || saved.record.assignmentId !== assignmentId) {
      return res.status(409).json({ error: 'Diagnostic attempt changed during read' })
    }
    return res.status(200).json({ record: saved.record, snapshot: saved.snapshot,
      task: item.taskSnapshot,
      observation: summarizeDiagnosticObservation(item.taskSnapshot, saved.snapshot),
      columnAlignment: analyzeDiagnosticColumnAlignment(item.taskSnapshot, saved.snapshot) })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Diagnostic storage unavailable', code: error.code })
  }
}
