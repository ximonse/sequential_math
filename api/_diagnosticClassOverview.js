import { kv } from '@vercel/kv'
import { isCurrentDiagnosticReview } from './_diagnosticReviewStore.js'
import { readDiagnosticAttempt } from './_diagnosticAttemptStore.js'
import { summarizeDiagnosticScreening } from '../src/domains/arithmetic/diagnosticScreeningSummary.js'

export async function listDiagnosticAssignmentAttempts(assignment, studentIds, { store = kv } = {}) {
  const ids = await store.smembers(`diagnostic_attempts_by_assignment:${assignment.assignmentId}`) || []
  const records = await Promise.all(ids.filter(id => /^[A-Za-z0-9_-]{1,128}$/u.test(id)).map(id => store.get(`diagnostic_attempt:${id}`)))
  return records.filter(record => record && studentIds.includes(record.studentId)
    && assignment.studentIds.includes(record.studentId)
    && record.assignmentId === assignment.assignmentId && record.classIdAtAttempt === assignment.classId
    && record.evidenceClass === 'diagnostic_only'
    && assignment.items.some(item => item.assignmentItemId === record.assignmentItemId
      && item.taskId === record.taskId && item.taskVersion === record.taskVersion))
}

export async function diagnosticClassOverview(assignment, studentIds, { store = kv } = {}) {
  const records = await listDiagnosticAssignmentAttempts(assignment, studentIds, { store })
  const roster = studentIds.filter(id => assignment.studentIds.includes(id))
  const rows = await Promise.all(roster.map(async studentId => {
    const items = await Promise.all(assignment.items.map(async item => {
      const latest = records.filter(record => record.studentId === studentId && record.assignmentItemId === item.assignmentItemId)
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0) || a.attemptId.localeCompare(b.attemptId))[0]
      const base = { assignmentItemId: item.assignmentItemId, taskId: item.taskId }
      if (!latest) return { ...base, attemptId: null, status: 'not_started', reviewed: false, screening: null }
      const [saved, review] = await Promise.all([
        readDiagnosticAttempt(latest.attemptId, { store }), store.get(`diagnostic_review:${latest.attemptId}`)
      ])
      const record = saved?.record
      if (!record || record.studentId !== studentId || record.assignmentId !== assignment.assignmentId
        || record.assignmentItemId !== item.assignmentItemId || record.classIdAtAttempt !== assignment.classId
        || record.taskId !== item.taskId || record.taskVersion !== item.taskVersion || record.evidenceClass !== 'diagnostic_only') {
        throw new Error('Diagnostic attempt changed during class read')
      }
      return { ...base, attemptId: record.attemptId, status: record.status,
        serverRevision: record.serverRevision, lastSequence: record.lastSequence,
        reviewed: isCurrentDiagnosticReview(review, record),
        screening: summarizeDiagnosticScreening(item.taskSnapshot, saved.snapshot) }
    }))
    const submitted = items.filter(item => item.status === 'submitted').length
    const started = items.filter(item => item.status !== 'not_started').length
    return { studentId, items, submitted, remaining: items.length - submitted,
      reviewed: items.filter(item => item.reviewed).length,
      status: submitted === items.length ? 'submitted' : started ? 'in_progress' : 'not_started' }
  }))
  return { items: assignment.items.map(item => ({ assignmentItemId: item.assignmentItemId, taskId: item.taskId,
    promptSv: item.taskSnapshot.promptSv, ...(item.taskSnapshot.answerType === 'text' ? { answerType: 'text' } : {}) })), rows }
}
