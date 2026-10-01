import { kv } from '@vercel/kv'

const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)

function safeStudentAssignment(assignment) {
  return { assignmentId: assignment.assignmentId, assignmentVersion: assignment.assignmentVersion,
    classId: assignment.classId, status: assignment.status, createdAt: assignment.createdAt,
    instructionSv: assignment.instructionSv,
    items: assignment.items.map(item => ({ assignmentItemId: item.assignmentItemId,
      taskId: item.taskId, taskVersion: item.taskVersion,
      promptSv: item.taskSnapshot?.promptSv || '' })) }
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
  return byClass.flat().filter(assignment => assignment.status === 'active'
    && assignment.studentIds?.includes(profile.studentId)).map(safeStudentAssignment)
}
