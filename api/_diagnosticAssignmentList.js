import { kv } from '@vercel/kv'

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)

function safeStudentAssignment(assignment) {
  return { assignmentId: assignment.assignmentId, assignmentVersion: assignment.assignmentVersion,
    classId: assignment.classId, status: assignment.status, createdAt: assignment.createdAt,
    titleSv: assignment.titleSv || 'Screening', instructionSv: assignment.instructionSv,
    items: assignment.items.map(item => ({ assignmentItemId: item.assignmentItemId,
      taskId: item.taskId, taskVersion: item.taskVersion,
      promptSv: item.taskSnapshot?.promptSv || '',
      ...(item.taskSnapshot?.answerType ? { answerType: item.taskSnapshot.answerType } : {}),
      ...(item.taskSnapshot?.gridEnabled !== undefined ? { gridEnabled: item.taskSnapshot.gridEnabled } : {}),
      ...(item.taskSnapshot?.drawingEnabled !== undefined ? { drawingEnabled: item.taskSnapshot.drawingEnabled } : {}) })) }
}

export async function listClassDiagnosticAssignments(classId, { store = kv } = {}) {
  if (!validId(classId)) return []
  if (await store.exists(`class_deleted:${classId}`)) return []
  const classRecord = await store.get(`class:${classId}`)
  if (!classRecord || classRecord.archived) return []
  const ids = await store.smembers(`diagnostic_assignments_by_class:${classId}`)
  const records = await Promise.all((ids || []).filter(validId).map(id => store.get(`diagnostic_assignment:${id}`)))
  return records.filter(item => item?.classId === classId && item.evidenceClass === 'diagnostic_only')
    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0))
}

export async function listPupilDiagnosticAssignments(profile, { store = kv } = {}) {
  if (!validId(profile?.studentId)) return []
  const classIds = [...new Set([profile.classId, ...(profile.classIds || [])].filter(validId))]
  const byClass = await Promise.all(classIds.map(classId => listClassDiagnosticAssignments(classId, { store })))
  const mine = byClass.flat().filter(assignment => assignment.status === 'active'
    && assignment.studentIds?.includes(profile.studentId))
  return Promise.all(mine.map(async assignment => {
    const result = safeStudentAssignment(assignment)
    await Promise.all(result.items.map(async item => {
      const id = await store.get(`diagnostic_active:${profile.studentId}:${item.assignmentItemId}`)
      const record = id ? await store.get(`diagnostic_attempt:${id}`) : null
      if (id && (!record || record.studentId !== profile.studentId || record.assignmentId !== assignment.assignmentId
        || record.assignmentItemId !== item.assignmentItemId || record.taskId !== item.taskId || record.taskVersion !== item.taskVersion)) {
        throw new Error('Saved collection is inconsistent')
      }
      item.attemptStatus = record?.status || 'not_started'
      if (record?.status === 'submitted') {
        const review = await store.get(`diagnostic_review:${id}`)
        const feedback = review?.feedback
        if (review?.studentId === profile.studentId && typeof feedback?.text === 'string'
          && feedback.evidenceRevision === record.serverRevision && feedback.evidenceSequence === record.lastSequence) {
          item.feedback = { text: feedback.text, publishedAt: feedback.publishedAt }
        }
      }
    }))
    const submitted = result.items.filter(item => item.attemptStatus === 'submitted').length
    result.submissionStatus = result.items.length > 0 && submitted === result.items.length ? 'submitted'
      : result.items.some(item => item.attemptStatus !== 'not_started') ? 'in_progress' : 'not_started'
    result.feedbackAvailable = result.items.some(item => Boolean(item.feedback))
    return result
  }))
}
