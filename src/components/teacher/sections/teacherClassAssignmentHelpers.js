import { apiFetch } from './adminApi'

const assignedTo = (classRecord, teacherId) => (classRecord.teacherIds || []).map(String).includes(String(teacherId))

// Classes shown as checkboxes for one teacher: live classes the teacher may be
// given (same school, or no school on the class) plus any the teacher already has.
export function selectableClassesForTeacher(classes, teacher, schoolIds = teacher?.schoolIds || []) {
  const schools = new Set(schoolIds.map(String))
  const isSuperAdmin = teacher?.role === 'super_admin'
  return (classes || [])
    .filter(classRecord => assignedTo(classRecord, teacher.id)
      || (!classRecord.archived && (isSuperAdmin || !classRecord.schoolId || schools.has(String(classRecord.schoolId)))))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'sv'))
}

export function assignedClassIds(classes, teacherId) {
  return (classes || []).filter(classRecord => assignedTo(classRecord, teacherId)).map(classRecord => String(classRecord.id))
}

// Only classes whose membership actually changes are returned, so untouched
// classes are never written.
export function teacherClassChanges({ classes, teacherId, selectedClassIds }) {
  const selected = new Set(selectedClassIds.map(String))
  const changes = []
  for (const classRecord of classes || []) {
    const has = assignedTo(classRecord, teacherId)
    const wants = selected.has(String(classRecord.id))
    if (has === wants) continue
    const others = (classRecord.teacherIds || []).map(String).filter(id => id !== String(teacherId))
    changes.push({ classId: String(classRecord.id), name: classRecord.name, adds: wants, teacherIds: wants ? [...others, String(teacherId)] : others })
  }
  return changes
}

// Runs the class writes one by one through the class API (which checks school
// membership and revisions) and reports which ones failed.
export async function applyClassChanges(changes) {
  const failed = []
  for (const change of changes) {
    const { ok, data } = await apiFetch('/api/admin/classes/' + change.classId, {
      method: 'PUT', body: JSON.stringify({ teacherIds: change.teacherIds })
    })
    if (!ok) failed.push({ classId: change.classId, name: change.name || change.classId, error: data?.error || 'Okänt fel' })
  }
  return failed
}
