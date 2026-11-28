import { geometryQuestionById } from './questions.js'
import { isGeometrySkill } from './groups.js'

const requiredConceptCount = skill => skill === 'geometry_lines' ? 4 : 6

function isFluentGeometryAnswer(record, task) {
  const seconds = Number(record.timeSpent)
  return record.correct === true && !record.interruptionSuspected && seconds > 0
    && seconds <= (task.responseMode === 'multiple' ? 18 : 12)
}

// Timing unlocks a new round or completes the final round. It never changes answer credit.
export function getGeometryLevel(history, skill) {
  const distinct = new Set()
  let fluent = 0
  const needed = requiredConceptCount(skill)
  for (let index = (history?.length || 0) - 1; index >= 0; index -= 1) {
    const record = history[index]
    if (record.domain !== 'geometry' || record.skill !== skill) continue
    if (record.level === 2) return 2
    if (distinct.size >= needed) continue
    const task = geometryQuestionById[record.values?.geometryTaskId]
    if (!task || distinct.has(task.concept)) continue
    distinct.add(task.concept)
    if (isFluentGeometryAnswer(record, task)) fluent += 1
  }
  return distinct.size >= needed && fluent >= needed - 1 ? 2 : 1
}

export function isGeometryFinalLevelPassed(history, skill) {
  if (!isGeometrySkill(skill)) return false
  const needed = requiredConceptCount(skill)
  const latest = new Map()
  let fluent = 0
  for (const row of history || []) {
    if (row.domain !== 'geometry' || row.skill !== skill || row.level !== 2) continue
    const task = geometryQuestionById[row.values?.geometryTaskId]
    if (!task || task.skill !== skill) continue

    if (latest.get(task.concept)) fluent -= 1
    latest.delete(task.concept)
    const passed = isFluentGeometryAnswer(row, task)
    latest.set(task.concept, passed)
    if (passed) fluent += 1

    if (latest.size > needed) {
      const oldest = latest.keys().next().value
      if (latest.get(oldest)) fluent -= 1
      latest.delete(oldest)
    }
    if (latest.size === needed && fluent >= needed - 1) return true
  }
  return false
}

export function isGeometryAssignment(assignment) {
  return assignment?.problemTypes?.length > 0 && assignment.problemTypes.every(isGeometrySkill)
}

export function countGeometryAssignmentAnswers(profile, assignment, since) {
  const history = profile?.problemLog?.length ? profile.problemLog : profile?.recentProblems || []
  return new Set(history.filter(row => row.domain === 'geometry' && row.timestamp >= since
    && row.trainingContext?.assignmentId === assignment.id).map(row => row.observationId)).size
}
