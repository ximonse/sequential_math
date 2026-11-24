import { readActiveAssignments } from '../../../lib/activeAssignments'

// The assignment library lives in each teacher's own workspace
// (`teacher_workspace:{teacherId}:assignments`), while the activation lives on
// the class, group or pupil record. A teacher who opens a class another teacher
// activated an assignment in therefore had nothing at all to show: the panel
// lists the teacher's own assignments and looks up where they are active. This
// collects the other direction — active assignments with no row of their own.
// They may also be the teacher's own, deleted from the library, so the wording
// stays neutral. Teacher names come from /api/teacher-groups; an unknown id is
// left out rather than shown raw.
export function collectForeignActiveAssignments(targets = [], ownAssignments = [], teacherNames = {}) {
  const own = new Set((Array.isArray(ownAssignments) ? ownAssignments : []).map(item => String(item?.id || '')))
  const byId = new Map()
  for (const target of Array.isArray(targets) ? targets : []) {
    for (const item of readActiveAssignments(target?.record)) {
      const id = item.assignment.id
      if (own.has(id)) continue
      const known = byId.get(id)
        || { id, assignment: item.assignment, activatedAt: 0, activatedByName: '', targets: [] }
      const name = String(target?.name || '').trim()
      if (name && !known.targets.includes(name)) known.targets.push(name)
      // The newest activation decides which version of the assignment is shown.
      if (item.activatedAt >= known.activatedAt) {
        known.activatedAt = item.activatedAt
        known.assignment = item.assignment
        known.activatedByName = item.activatedBy && Object.hasOwn(teacherNames || {}, item.activatedBy)
          ? String(teacherNames[item.activatedBy] || '') : ''
      }
      byId.set(id, known)
    }
  }
  return [...byId.values()].sort((a, b) => b.activatedAt - a.activatedAt
    || String(a.assignment.title).localeCompare(String(b.assignment.title), 'sv'))
}

// `{ id: displayName }` for the teacher list /api/teacher-groups returns.
export function teacherNameMap(teachers) {
  const map = {}
  for (const teacher of Array.isArray(teachers) ? teachers : []) {
    const id = String(teacher?.id || '').trim()
    if (id) map[id] = String(teacher.displayName || '').trim()
  }
  return map
}
