export async function loadStudentLoginClasses() {
  const response = await fetch('/api/student-login', { cache: 'no-store' })
  if (!response.ok) throw new Error('Klasserna kunde inte hämtas.')
  const data = await response.json()
  if (!Array.isArray(data?.classes)) throw new Error('Klasserna kunde inte hämtas.')
  return data.classes.filter(item => typeof item?.id === 'string' && typeof item?.name === 'string')
}

export async function resolveClassStudentId(classId, name, password, schoolId = '') {
  try {
    const response = await fetch('/api/student-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, name: name.trim(), password, schoolId })
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
