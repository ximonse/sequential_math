import { getTeacherApiToken } from './teacherAuth'

export async function loadTeacherPupilLabels() {
  const token = getTeacherApiToken()
  if (!token) return {}
  try {
    const response = await fetch('/api/teacher-pupil-labels', {
      headers: { 'x-teacher-token': token }, cache: 'no-store'
    })
    if (!response.ok) return {}
    const data = await response.json()
    return data?.labels && typeof data.labels === 'object' ? data.labels : {}
  } catch {
    return {}
  }
}

export async function saveTeacherPupilLabel(studentId, label) {
  const token = getTeacherApiToken()
  if (!token) return { ok: false }
  try {
    const response = await fetch('/api/teacher-pupil-labels', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-teacher-token': token },
      body: JSON.stringify({ studentId, label })
    })
    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, labels: data?.labels || {}, error: data?.error || '' }
  } catch {
    return { ok: false, error: 'Kunde inte spara tilltalsnamnet.' }
  }
}
