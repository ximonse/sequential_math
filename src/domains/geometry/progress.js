import { geometryQuestionById } from './questions.js'
import { isGeometrySkill } from './groups.js'

// Timing only unlocks a new geometry round; it never changes answer credit.
export function getGeometryLevel(history, skill) {
  const distinct = new Set()
  let fluent = 0
  const needed = skill === 'geometry_lines' ? 4 : 6
  for (let index = (history?.length || 0) - 1; index >= 0; index -= 1) {
    const record = history[index]
    if (record.domain !== 'geometry' || record.skill !== skill) continue
    if (record.level === 2) return 2
    if (distinct.size >= needed) continue
    const task = geometryQuestionById[record.values?.geometryTaskId]
    if (!task || distinct.has(task.concept)) continue
    distinct.add(task.concept)
    const seconds = Number(record.timeSpent)
    if (record.correct && !record.interruptionSuspected && seconds > 0
      && seconds <= (task.responseMode === 'multiple' ? 18 : 12)) fluent += 1
  }
  return distinct.size >= needed && fluent >= needed - 1 ? 2 : 1
}

export function isGeometryAssignment(assignment) {
  return assignment?.problemTypes?.length > 0 && assignment.problemTypes.every(isGeometrySkill)
}

export function countGeometryAssignmentAnswers(profile, assignment, since) {
  const history = profile?.problemLog?.length ? profile.problemLog : profile?.recentProblems || []
  return new Set(history.filter(row => row.domain === 'geometry' && row.timestamp >= since
    && row.trainingContext?.assignmentId === assignment.id).map(row => row.observationId)).size
}
