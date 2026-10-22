const keyOf = value => String(value ?? '')

// Collects what is active for each picked recipient: assignments given to it
// directly, and the home-page tickets its pupils currently see.
export function buildRecipientOverview(recipients = [], { assignmentTargets = [], assignments = [], groups = [], students = [] } = {}) {
  const titleById = new Map(assignments.map(item => [keyOf(item.id), item.title]))
  const studentByKey = new Map(students.map(item => [keyOf(item.studentId).toLowerCase(), item]))
  return recipients.map(pick => {
    const target = assignmentTargets.find(item => item.type === pick.type && keyOf(item.id) === keyOf(pick.id))
    let pupils = []
    if (pick.type === 'class') {
      pupils = students.filter(student => [student.classId, ...(student.classIds || [])].map(keyOf).includes(keyOf(pick.id)))
    } else if (pick.type === 'group') {
      const group = groups.find(item => keyOf(item.id) === keyOf(pick.id))
      pupils = (group?.pupilIds || []).map(id => studentByKey.get(keyOf(id).toLowerCase())).filter(Boolean)
    } else {
      pupils = [studentByKey.get(keyOf(pick.id).toLowerCase())].filter(Boolean)
    }
    const tickets = new Map()
    for (const pupil of pupils) {
      const ticket = pupil.ticketInbox?.activePayload
      if (!ticket) continue
      const title = ticket.title || ticket.question || 'Ticket'
      tickets.set(title, (tickets.get(title) || 0) + 1)
    }
    return {
      type: pick.type,
      id: keyOf(pick.id),
      name: target?.name || pupils[0]?.name || keyOf(pick.id),
      pupilCount: pupils.length,
      assignmentTitles: (target?.assignmentIds || []).map(id => titleById.get(keyOf(id))).filter(Boolean),
      tickets: [...tickets].map(([title, count]) => ({ title, count }))
    }
  })
}
