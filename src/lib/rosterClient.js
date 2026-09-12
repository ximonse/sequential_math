import { getTeacherApiToken, getTeacherIdentity } from './teacherAuth'
import { parseRosterLines } from './storageClassHelpers'

const pendingKey = 'mathapp_pending_roster_request'
const pendingPilotKey = 'mathapp_pending_pilot_roster_request'

function getRetryId(key, signature) {
  let previous
  try { previous = JSON.parse(localStorage.getItem(key) || 'null') } catch { previous = null }
  const requestId = previous?.signature === signature ? previous.requestId : crypto.randomUUID()
  localStorage.setItem(key, JSON.stringify({ signature, requestId }))
  return requestId
}

export async function submitRoster({ classId, className, schoolId = '', rosterText, grade = 4, existingStudentIds = [] }) {
  const names = parseRosterLines(rosterText)
  if (!classId && !String(className || '').trim()) return { ok: false, error: 'Ange klassnamn.' }
  if (!names.length && !existingStudentIds.length) return { ok: false, error: 'Ange minst en elev.' }
  try {
    if (!getTeacherApiToken()) return { ok: false, error: 'Logga in som lärare igen.' }
    const owner = getTeacherIdentity().teacherId || 'admin'
    const signature = JSON.stringify({ owner, classId, className, names, grade, existingStudentIds, ...(schoolId ? { schoolId } : {}) })
    const requestId = getRetryId(pendingKey, signature)
    const response = await fetch('/api/student-roster', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
      body: JSON.stringify({ classId, className, names, grade, existingStudentIds, requestId, ...(schoolId ? { schoolId } : {}) })
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

export async function submitPilotRoster({ classId = '', className = '', schoolId = '', grade = 4, count }) {
  const normalizedClassId = String(classId || '').trim()
  const normalizedClassName = String(className || '').trim()
  if (!normalizedClassId && !normalizedClassName) return { ok: false, error: 'Ange klassnamn.' }
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return { ok: false, error: 'Ange mellan 1 och 100 pseudonyma elevplatser.' }
  }

  try {
    if (!getTeacherApiToken()) return { ok: false, error: 'Logga in som lärare igen.' }
    const owner = getTeacherIdentity().teacherId || 'admin'
    const signature = JSON.stringify({
      owner, classId: normalizedClassId, className: normalizedClassName, schoolId, grade, pilotCount: count
    })
    const requestId = getRetryId(pendingPilotKey, signature)
    const response = await fetch('/api/student-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
      body: JSON.stringify({
        classId: normalizedClassId, className: normalizedClassName, grade, pilotCount: count, requestId,
        ...(schoolId ? { schoolId } : {})
      })
    })
    const data = await response.json()
    if (!response.ok) return { ok: false, error: data.error || 'Kunde inte skapa elevplatserna. Försök igen.' }
    const validCredential = item => item && item.ok === true
      && typeof item.studentId === 'string' && typeof item.displayAlias === 'string'
      && typeof item.qrSecret === 'string' && item.qrSecret.length >= 40
      && typeof item.pin === 'string' && /^\d{4}$/.test(item.pin)
    if (!data.class?.id || !Array.isArray(data.results) || data.results.length !== count
      || data.results.some(item => !item || typeof item.ok !== 'boolean')
      || data.results.filter(item => item.ok).some(item => !validCredential(item))
      || Boolean(data.ok) !== data.results.every(item => item.ok)) {
      return { ok: false, error: 'Serverns sparbesked var ofullständigt. Försök igen med samma antal.' }
    }
    const credentials = data.results.filter(item => item.ok).map(item => ({
      studentId: item.studentId, displayAlias: item.displayAlias, qrSecret: item.qrSecret, pin: item.pin
    }))
    const failed = data.results.filter(item => !item.ok)
    if (data.ok) localStorage.removeItem(pendingPilotKey)
    return {
      ok: Boolean(data.ok),
      classRecord: { ...data.class, studentIds: credentials.map(item => item.studentId) },
      addedCount: credentials.length,
      credentials,
      error: failed.length ? credentials.length + ' elevplatser skapades. Försök igen med samma antal för resten.' : undefined
    }
  } catch {
    return { ok: false, error: 'Kunde inte kontakta servern. Försök igen med samma antal.' }
  }
}
