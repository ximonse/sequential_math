const key = value => String(value ?? '')
export const recipientKey = pick => `${pick.type}:${key(pick.id)}`
export const normalizeRecipientSearch = value => key(value).toLocaleLowerCase('sv').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export const pupilClassIds = student => [...new Set([student.classId, ...(student.classIds || [])].filter(Boolean).map(key))]

export function recipientChoices({ classes = [], groups = [], students = [] }) {
  const names = new Map(classes.map(item => [key(item.id), item.name]))
  const classMembers = id => students.filter(student => pupilClassIds(student).includes(key(id))).map(student => student.studentId)
  return [
    ...classes.map(item => ({ type: 'class', id: key(item.id), name: item.name,
      label: `Klass: ${item.name}`, members: classMembers(item.id), detail: `${classMembers(item.id).length} ${classMembers(item.id).length === 1 ? 'elev' : 'elever'}` })),
    ...groups.map(item => ({ type: 'group', id: key(item.id), name: item.name,
      label: `Grupp: ${item.name}`, members: item.pupilIds || [], detail: `${item.pupilIds?.length || 0} elever` })),
    ...students.map(student => ({ type: 'student', id: key(student.studentId), name: student.name || student.displayAlias || 'Elev utan namn',
      label: `Elev: ${student.name || student.displayAlias || 'Elev utan namn'}`, members: [student.studentId],
      detail: pupilClassIds(student).map(id => names.get(id)).filter(Boolean).join(', ') || 'Utan klass' }))
  ]
}

export function resolveRecipientSelection(recipients, context) {
  const choices = recipientChoices(context)
  const picked = new Set(recipients.map(recipientKey))
  const selected = choices.filter(item => picked.has(recipientKey(item)))
  const memberIds = new Set(selected.flatMap(item => item.members.map(normalizeRecipientSearch)))
  const pupils = context.students.filter(student => memberIds.has(normalizeRecipientSearch(student.studentId)))
  return { selected, pupils, missing: recipients.length - selected.length,
    unavailablePupils: memberIds.size - pupils.length }
}

// Freeze an exact, deduplicated roster for review and delivery. A pupil with
// several class memberships belongs to just one of the selected class buckets.
export function resolveScreeningRecipients(recipients, context) {
  const selection = resolveRecipientSelection(recipients, context)
  const classes = new Map(context.classes.map(item => [key(item.id), item]))
  const chosenClasses = new Set(recipients.filter(item => item.type === 'class').map(item => key(item.id)))
  const dispatches = new Map(), withoutClass = []
  for (const student of selection.pupils) {
    const ids = pupilClassIds(student).filter(id => classes.has(id))
    const classId = ids.find(id => chosenClasses.has(id)) || ids[0]
    if (!classId) { withoutClass.push(student.name || 'Elev utan klass'); continue }
    if (!dispatches.has(classId)) dispatches.set(classId, { classId, className: classes.get(classId).name, wholeClass: false, studentIds: [] })
    dispatches.get(classId).studentIds.push(student.studentId)
  }
  return { ...selection, dispatches: [...dispatches.values()], withoutClass }
}
