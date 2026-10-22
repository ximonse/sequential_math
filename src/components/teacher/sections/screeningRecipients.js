// The server stores one screening per class, so the shared recipient picks are
// split into one dispatch per class: whole classes, or the picked pupils in it.
export function buildScreeningDispatches(recipients = [], { classes = [], groups = [], students = [] } = {}) {
  const classIds = new Set(classes.map(item => String(item.id)))
  const classNameById = new Map(classes.map(item => [String(item.id), item.name]))
  const studentByKey = new Map(students.map(item => [String(item.studentId).toLowerCase(), item]))
  const byClass = new Map()
  const withoutClass = []
  const bucket = classId => {
    if (!byClass.has(classId)) byClass.set(classId, { classId, className: classNameById.get(classId) || classId, wholeClass: false, studentIds: [] })
    return byClass.get(classId)
  }
  const addPupil = id => {
    const student = studentByKey.get(String(id).toLowerCase())
    if (!student) return
    const classId = [student.classId, ...(student.classIds || [])].map(String).find(candidate => classIds.has(candidate))
    if (!classId) { withoutClass.push(student.name || student.studentId); return }
    const target = bucket(classId)
    if (!target.studentIds.includes(student.studentId)) target.studentIds.push(student.studentId)
  }
  for (const pick of recipients) {
    if (pick.type === 'class' && classIds.has(String(pick.id))) bucket(String(pick.id)).wholeClass = true
    else if (pick.type === 'student') addPupil(pick.id)
    else if (pick.type === 'group') {
      const group = groups.find(item => String(item.id) === String(pick.id))
      for (const pupilId of group?.pupilIds || []) addPupil(pupilId)
    }
  }
  const dispatches = [...byClass.values()].map(item => (item.wholeClass ? { ...item, studentIds: [] } : item))
  return { dispatches, withoutClass }
}
