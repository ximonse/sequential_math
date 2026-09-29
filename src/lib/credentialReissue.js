import { getTeacherApiToken } from './teacherAuth'

// Reissues one pupil's PIN and QR secret. The server keeps the code name,
// the name and all training data.
export async function reissueStudentCredential(studentId) {
  const response = await fetch(`/api/student/${encodeURIComponent(studentId)}/credentials`, {
    method: 'POST',
    headers: { 'x-teacher-token': getTeacherApiToken() }
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.credential) throw new Error(data?.error || 'Kunde inte skapa elevkortet.')
  return data.credential
}

// One pupil at a time, and a failure never stops the rest: a reissued card
// has already invalidated the old one, so every success must reach the teacher.
export async function reissueStudentCredentials(studentIds, { onProgress } = {}) {
  const credentials = []
  const failed = []
  for (const [index, studentId] of studentIds.entries()) {
    onProgress?.(index + 1, studentIds.length)
    try {
      credentials.push(await reissueStudentCredential(studentId))
    } catch (error) {
      failed.push({ studentId, error: error?.message || 'Kunde inte skapa elevkortet.' })
    }
  }
  return { credentials, failed }
}
