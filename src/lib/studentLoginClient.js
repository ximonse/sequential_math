export async function resolveStudentLogin(name, password) {
  try {
    const response = await fetch('/api/student-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), password })
    })
    const data = await response.json()
    if (!response.ok) return { ok: false, error: data?.error || 'Kunde inte logga in.' }
    if (typeof data?.studentId !== 'string' || !data.studentId.trim()
      || !Array.isArray(data?.assignments) || data.assignments.length === 0) {
      return { ok: false, error: 'Kunde inte hitta elevkontot. Försök igen.' }
    }
    const assignments = data.assignments.filter(item => (
      typeof item?.classId === 'string' && item.classId.trim()
      && typeof item?.className === 'string' && item.className.trim()
      && typeof item?.schoolName === 'string' && item.schoolName.trim()
    ))
    if (assignments.length === 0) return { ok: false, error: 'Du har ingen aktiv klass eller grupp tilldelad. Be din lärare om hjälp.' }
    return { ok: true, studentId: data.studentId, assignments }
  } catch {
    return { ok: false, error: 'Kunde inte nå inloggningen. Kontrollera anslutningen och försök igen.' }
  }
}
