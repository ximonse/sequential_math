export function applyTicketRevealForAllStudents({
  dispatchId,
  reveal,
  students,
  onSetStudents,
  setTicketDispatches,
  setStatus,
  setTicketDispatchReveal,
  setTicketRevealAllForProfile,
  getTicketDispatches,
  saveProfile
}) {
  const updated = setTicketDispatchReveal(dispatchId, reveal)
  if (!updated) return

  const nextStudents = students.map(student => {
    const next = { ...student }
    setTicketRevealAllForProfile(next, dispatchId, reveal)
    saveProfile(next, { forceSync: true })
    return next
  })

  if (typeof onSetStudents === 'function') onSetStudents(nextStudents)
  setTicketDispatches(getTicketDispatches())
  setStatus(reveal ? 'Facit visas nu för alla elever.' : 'Facit är dolt igen.')
}

export function publishTicketToHomeForTargets({
  dispatchId,
  ticketDispatches,
  ticketResolvedTargetStudentIds,
  students,
  onSetStudents,
  setTicketDispatches,
  setStatus,
  encodeTicketPayload,
  recordTicketDispatchTargets,
  getTicketDispatches,
  saveProfile
}) {
  const dispatch = ticketDispatches.find(item => item.id === dispatchId)
  if (!dispatch) return

  const now = Date.now()
  const payload = {
    dispatchId: dispatch.id,
    ticketId: dispatch.ticketId || '',
    title: dispatch.title || '',
    kind: dispatch.kind || 'start',
    question: dispatch.question || '',
    answer: dispatch.answer || '',
    showCorrectnessOnSubmit: dispatch.showCorrectnessOnSubmit !== false
  }
  const encoded = encodeTicketPayload(payload)
  const targetIds = new Set(ticketResolvedTargetStudentIds)

  if (targetIds.size === 0) {
    setStatus('Välj minst en klass eller elev att skicka ticket till.')
    return
  }

  recordTicketDispatchTargets(dispatch.id, Array.from(targetIds))

  const nextStudents = students.map(student => {
    if (!targetIds.has(student.studentId)) return student

    const next = { ...student }
    if (!next.ticketInbox || typeof next.ticketInbox !== 'object') next.ticketInbox = {}
    next.ticketInbox.activeDispatchId = dispatch.id
    next.ticketInbox.activePayload = payload
    next.ticketInbox.activeEncoded = encoded
    next.ticketInbox.publishedAt = now
    next.ticketInbox.updatedAt = now
    next.ticketInbox.clearedAt = 0
    saveProfile(next, { forceSync: true })
    return next
  })

  if (typeof onSetStudents === 'function') onSetStudents(nextStudents)
  setTicketDispatches(getTicketDispatches())
  setStatus(`Ticket publicerad till startsidan för ${targetIds.size} elev(er).`)
}

export function clearTicketFromHomeForTargets({
  dispatchId,
  ticketResolvedTargetStudentIds,
  students,
  onSetStudents,
  setStatus,
  saveProfile
}) {
  const now = Date.now()
  const targetIds = new Set(ticketResolvedTargetStudentIds)

  if (targetIds.size === 0) {
    setStatus('Välj minst en klass eller elev att rensa ticket från.')
    return
  }

  const nextStudents = students.map(student => {
    if (!targetIds.has(student.studentId)) return student
    if (!student.ticketInbox || student.ticketInbox.activeDispatchId !== dispatchId) return student

    const next = { ...student }
    next.ticketInbox = {
      ...next.ticketInbox,
      activeDispatchId: '',
      activePayload: null,
      activeEncoded: '',
      updatedAt: now,
      clearedAt: now
    }
    saveProfile(next, { forceSync: true })
    return next
  })

  if (typeof onSetStudents === 'function') onSetStudents(nextStudents)
  setStatus('Ticket borttagen från startsidan för valt urval.')
}
