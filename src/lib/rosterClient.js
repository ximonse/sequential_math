import { getTeacherApiToken, getTeacherIdentity } from './teacherAuth'
import { parseRosterLines } from './storageClassHelpers'

const pendingKey = 'mathapp_pending_roster_request'

export async function submitRoster({ classId, className, rosterText, grade = 4, existingStudentIds = [] }) {
  const names = parseRosterLines(rosterText)
  if (!classId && !String(className || '').trim()) return { ok: false, error: 'Ange klassnamn.' }
  if (!names.length && !existingStudentIds.length) return { ok: false, error: 'Ange minst en elev.' }
  try {
    if (!getTeacherApiToken()) return { ok: false, error: 'Logga in som lärare igen.' }
    const owner = getTeacherIdentity().teacherId || 'admin'
    const signature = JSON.stringify({ owner, classId, className, names, grade, existingStudentIds })
    let previous
    try { previous = JSON.parse(localStorage.getItem(pendingKey) || 'null') } catch { previous = null }
    const requestId = previous?.signature === signature ? previous.requestId : crypto.randomUUID()
    localStorage.setItem(pendingKey, JSON.stringify({ signature, requestId }))
    const response = await fetch('/api/student-roster', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
      body: JSON.stringify({ classId, className, names, grade, existingStudentIds, requestId })
    })
    const data = await response.json()
    if (!response.ok) return { ok: false, error: data.error || 'Kunde inte spara klasslistan. Försök igen.' }
    if (!data.class?.id || !Array.isArray(data.results)
      || data.results.length !== names.length + existingStudentIds.length
      || data.results.some(item => !item || typeof item.ok !== 'boolean' || typeof item.studentId !== 'string')
      || Boolean(data.ok) !== data.results.every(item => item.ok)) {
      return { ok: false, error: 'Serverns sparbesked var ofullständigt. Behåll listan och försök igen.' }
    }
    const successful = (data.results || []).filter(item => item.ok)
    const failed = (data.results || []).filter(item => !item.ok)
    if (data.ok) localStorage.removeItem(pendingKey)
    return { ok: Boolean(data.ok), classRecord: { ...data.class, studentIds: successful.map(item => item.studentId) },
      addedCount: successful.length, results: data.results,
      error: failed.length ? `${successful.length} sparade. Återstår: ${failed.map(item => item.name || item.studentId).join(', ')}. Försök igen med samma lista.` : undefined }
  } catch { return { ok: false, error: 'Kunde inte kontakta servern. Behåll listan och försök igen.' } }
}
