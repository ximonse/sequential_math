export async function applyTicketRevealForAllStudents({
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

  try {
  const nextStudents = await Promise.all(students.map(async student => {
    const next = structuredClone(student)
    setTicketRevealAllForProfile(next, dispatchId, reveal)
    return await saveProfile(next, ['ticketRevealAll'], dispatchId)
  }))

  if (typeof onSetStudents === 'function') onSetStudents(nextStudents)
  setTicketDispatches(getTicketDispatches())
  setStatus(reveal ? 'Facit visas nu för alla elever.' : 'Facit är dolt igen.')
  } catch { setStatus('Alla ändringar kunde inte sparas. Försök igen för hela urvalet.') }
}

export async function publishTicketToHomeForTargets({
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

  try {
  const nextStudents = await Promise.all(students.map(async student => {
    if (!targetIds.has(student.studentId)) return student

    const next = structuredClone(student)
    if (!next.ticketInbox || typeof next.ticketInbox !== 'object') next.ticketInbox = {}
    next.ticketInbox.activeDispatchId = dispatch.id
    next.ticketInbox.activePayload = payload
    next.ticketInbox.activeEncoded = encoded
    next.ticketInbox.publishedAt = now
    next.ticketInbox.updatedAt = now
    next.ticketInbox.clearedAt = 0
    return await saveProfile(next, ['ticketInbox'])
  }))

  if (typeof onSetStudents === 'function') onSetStudents(nextStudents)
  setTicketDispatches(getTicketDispatches())
  setStatus(`Ticket publicerad till startsidan för ${targetIds.size} elev(er).`)
  } catch { setStatus('Ticket kunde inte sparas för alla elever. Försök igen för hela urvalet.') }
}

export async function clearTicketFromHomeForTargets({
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

  try {
  const nextStudents = await Promise.all(students.map(async student => {
    if (!targetIds.has(student.studentId)) return student
    if (!student.ticketInbox || student.ticketInbox.activeDispatchId !== dispatchId) return student

    const next = structuredClone(student)
    next.ticketInbox = {
      ...next.ticketInbox,
      activeDispatchId: '',
      activePayload: null,
      activeEncoded: '',
      updatedAt: now,
      clearedAt: now
    }
    return await saveProfile(next, ['ticketInbox'])
  }))

  if (typeof onSetStudents === 'function') onSetStudents(nextStudents)
  setStatus('Ticket borttagen från startsidan för valt urval.')
  } catch { setStatus('Ticket kunde inte tas bort för alla elever. Försök igen för hela urvalet.') }
}
