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

// Checks each dispatch against what the server lets this class receive: the
// whole roster, or only the accounts on the test list. Unchecked classes wait.
export function applyScreeningLimits(dispatches = [], limits = {}) {
  const ready = []
  const blocked = []
  const pending = []
  for (const dispatch of dispatches) {
    const limit = limits[dispatch.classId]
    if (!limit) { pending.push(dispatch); continue }
    if (limit.unavailable) { blocked.push({ ...dispatch, reason: 'screening är inte aktiverat på servern' }); continue }
    if (dispatch.wholeClass) {
      if (limit.wholeClassAvailable) ready.push(dispatch)
      else blocked.push({ ...dispatch, reason: 'testbegränsningen tillåter inte hela klassen' })
      continue
    }
    const allowed = dispatch.studentIds.filter(id => limit.allowed.includes(id))
    if (allowed.length === dispatch.studentIds.length) ready.push(dispatch)
    else if (allowed.length > 0) {
      ready.push({ ...dispatch, studentIds: allowed })
      blocked.push({ ...dispatch, studentIds: dispatch.studentIds.filter(id => !allowed.includes(id)), reason: 'eleverna finns inte på testlistan' })
    } else blocked.push({ ...dispatch, reason: 'eleverna finns inte på testlistan' })
  }
  return { ready, blocked, pending }
}
