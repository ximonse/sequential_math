import { acceptStudentSessionPayload } from './studentSessionClient'

export async function getClassLogin(classToken) {
  const response = await fetch(`/api/student-login?class=${encodeURIComponent(classToken)}`, { cache: 'no-store' })
  const data = await response.json()
  return response.ok && data?.className ? { ok: true, className: data.className } : { ok: false, error: data?.error || 'Klasslänken fungerar inte.' }
}

export async function resolveStudentLogin({ classToken, name, code, remember }) {
  try {
    const response = await fetch('/api/student-login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classToken, name: name.trim(), code, remember: remember === true }) })
    const data = await response.json()
    if (!response.ok || !data?.classId) return { ok: false, error: data?.error || 'Kunde inte logga in.' }
    if (data?.student && data?.csrfToken) {
      const accepted = acceptStudentSessionPayload(data)
      return accepted.ok ? { ...accepted, classId: data.classId } : accepted
    }
    if (!data?.studentId || !data?.sessionSecret) return { ok: false, error: data?.error || 'Kunde inte logga in.' }
    return { ok: true, studentId: data.studentId, sessionSecret: data.sessionSecret, classId: data.classId }
  } catch { return { ok: false, error: 'Kunde inte nå inloggningen. Kontrollera anslutningen och försök igen.' } }
}
