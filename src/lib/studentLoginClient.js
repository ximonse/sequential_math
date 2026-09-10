export async function resolveStudentLogin(name, password) {
  try {
    const response = await fetch('/api/student-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), password })
    })
    const data = await response.json()
    if (!response.ok) return { ok: false, error: data?.error || 'Kunde inte logga in.' }
    if (typeof data?.studentId !== 'string' || !data.studentId.trim()) {
      return { ok: false, error: 'Kunde inte hitta elevkontot. Försök igen.' }
    }
    return { ok: true, studentId: data.studentId }
  } catch {
    return { ok: false, error: 'Kunde inte nå inloggningen. Kontrollera anslutningen och försök igen.' }
  }
}
