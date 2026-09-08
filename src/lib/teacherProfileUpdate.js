import { getTeacherApiToken } from './teacherAuth'
import { loadTeacherProfile } from './storage'
import { toTeacherListProfile } from './teacherListProfile'

export async function saveTeacherTicketProfile(listProfile, fields, dispatchId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await loadTeacherProfile(listProfile.studentId)
    if (!current) throw new Error('Kunde inte hämta elevens fullständiga profil.')
    const changes = {}
    for (const field of fields) {
      if (Object.hasOwn(listProfile, field)) changes[field] = listProfile[field]
    }
    if (fields.includes('ticketRevealAll') && dispatchId) {
      changes.ticketRevealAll = { ...current.ticketRevealAll }
      if (listProfile.ticketRevealAll?.[dispatchId]) changes.ticketRevealAll[dispatchId] = listProfile.ticketRevealAll[dispatchId]
      else delete changes.ticketRevealAll[dispatchId]
    }
    const response = await fetch(`/api/student/${encodeURIComponent(current.studentId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
      body: JSON.stringify({ changes, serverRevision: current.serverRevision || 0 })
    })
    if (response.status === 409) continue
    if (!response.ok) throw new Error('Kunde inte spara lärarändringen. Försök igen.')
    return toTeacherListProfile({ ...current, ...changes })
  }
  throw new Error('Elevens profil ändrades samtidigt. Försök igen.')
}
