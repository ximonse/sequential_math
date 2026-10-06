import { kv } from '@vercel/kv'
import { getLiveTeacherAuthPayload, withCors } from './_helpers.js'
import { canAccessClass } from './_studentAccess.js'
import { isSchoolAdminRole } from './_teacherRoles.js'
import { diagnosticApiEnabled, diagnosticAssignablePupilsInClass } from './_diagnosticApiAccess.js'
import { listClassDiagnosticAssignments } from './_diagnosticAssignmentList.js'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { summarizeDiagnosticObservation } from '../src/domains/arithmetic/diagnosticObservation.js'
import { analyzeDiagnosticColumnAlignment } from '../src/domains/arithmetic/diagnosticColumnAlignment.js'
import { analyzeDiagnosticVisibleResult } from '../src/domains/arithmetic/diagnosticVisibleResult.js'
import { analyzeDiagnosticSubtractionPattern } from '../src/domains/arithmetic/diagnosticSubtractionPattern.js'
import { identifyDiagnosticObservationRevision } from '../src/domains/arithmetic/diagnosticObservationRevision.js'
import { diagnosticClassOverview, listDiagnosticAssignmentAttempts } from './_diagnosticClassOverview.js'
import { saveDiagnosticReview } from './_diagnosticReviewStore.js'

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)

export default async function handler(req, res) {
  withCors(res, { methods: 'GET,POST,OPTIONS', headers: 'Content-Type,x-teacher-token' }, req)
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })
  if (!diagnosticApiEnabled()) return res.status(404).json({ error: 'Diagnostic pilot is unavailable' })
  try {
    const auth = await getLiveTeacherAuthPayload(req)
    if (!auth) return res.status(401).json({ error: 'Teacher authorization required' })
    if (!isSchoolAdminRole(auth.role, auth.isAdmin)) {
      return res.status(403).json({ error: 'Diagnostic pilot requires admin access' })
    }
    const input = req.method === 'GET' ? req.query || {} : req.body || {}
    const { classId, studentId, assignmentId, attemptId } = input
    if (![classId, assignmentId].every(validId)
      || (studentId !== undefined && !validId(studentId))
      || (req.method === 'POST' && (!validId(studentId) || !validId(attemptId)))
      || (studentId === undefined && attemptId !== undefined)
      || (attemptId !== undefined && !validId(attemptId))) {
      return res.status(400).json({ error: 'Invalid diagnostic identity' })
    }
    if (!await canAccessClass(req, classId)) {
      return res.status(403).json({ error: 'Not authorized for this class' })
    }
    const allowed = await diagnosticAssignablePupilsInClass(classId)
    if (studentId !== undefined && !allowed.includes(studentId)) {
      return res.status(403).json({ error: 'Not authorized for this pupil and class' })
    }
    const assignment = (await listClassDiagnosticAssignments(classId))
      .find(item => item.assignmentId === assignmentId && (studentId === undefined || item.studentIds?.includes(studentId)))
    if (!assignment) return res.status(404).json({ error: 'Diagnostic assignment not found' })
    if (studentId === undefined) return res.status(200).json(await diagnosticClassOverview(assignment, allowed))
    const attempts = await listDiagnosticAssignmentAttempts(assignment, [studentId])
    if (attemptId === undefined) {
      return res.status(200).json({ attempts: attempts.map(record => ({ attemptId: record.attemptId,
        assignmentItemId: record.assignmentItemId, taskId: record.taskId,
        taskVersion: record.taskVersion, status: record.status,
        serverRevision: record.serverRevision, lastSequence: record.lastSequence,
        createdAt: record.createdAt || null })) })
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
    if (req.method === 'POST') {
      const review = await saveDiagnosticReview(saved.record, input, auth.teacherId)
      return res.status(200).json({ review })
    }
    const evidenceRevision = identifyDiagnosticObservationRevision(saved.record, saved.snapshot)
    const observation = summarizeDiagnosticObservation(item.taskSnapshot, saved.snapshot)
    const columnAlignment = analyzeDiagnosticColumnAlignment(item.taskSnapshot, saved.snapshot)
    const visibleResult = analyzeDiagnosticVisibleResult(item.taskSnapshot, saved.snapshot)
    const subtractionPattern = analyzeDiagnosticSubtractionPattern(item.taskSnapshot, saved.snapshot)
    const review = await kv.get(`diagnostic_review:${attemptId}`)
    return res.status(200).json({ record: saved.record, snapshot: saved.snapshot, review,
      task: item.taskSnapshot, evidenceRevision, observation, columnAlignment,
      visibleResult, subtractionPattern })
  } catch (error) {
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Diagnostic storage unavailable', code: error.code })
  }
}
