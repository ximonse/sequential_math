import { kv } from '@vercel/kv'
import { isCurrentDiagnosticReview } from './_diagnosticReviewStore.js'

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
  const reviews = new Map(await Promise.all(records.map(async record =>
    [record.attemptId, await store.get(`diagnostic_review:${record.attemptId}`)])))
  const rows = studentIds.filter(id => assignment.studentIds.includes(id)).map(studentId => {
    const items = assignment.items.map(item => {
      const record = records.filter(record => record.studentId === studentId && record.assignmentItemId === item.assignmentItemId)
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0) || a.attemptId.localeCompare(b.attemptId))[0]
      return { assignmentItemId: item.assignmentItemId, taskId: item.taskId,
        attemptId: record?.attemptId || null, status: record?.status || 'not_started',
        reviewed: record ? isCurrentDiagnosticReview(reviews.get(record.attemptId), record) : false }
    })
    const submitted = items.filter(item => item.status === 'submitted').length
    const started = items.filter(item => item.status !== 'not_started').length
    return { studentId, items, submitted, remaining: items.length - submitted,
      reviewed: items.filter(item => item.reviewed).length,
      status: submitted === items.length ? 'submitted' : started ? 'in_progress' : 'not_started' }
  })
  return { items: assignment.items.map(item => ({ assignmentItemId: item.assignmentItemId, taskId: item.taskId, promptSv: item.taskSnapshot.promptSv })), rows }
}
