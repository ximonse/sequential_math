import { getActiveStudentSessionSecret } from './storage'

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function fetchHighscores(game, classId) {
  if (!classId) return []
  try {
    const res = await fetch(`${API_BASE}/api/highscores?game=${game}&classId=${encodeURIComponent(classId)}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.highscores || []
  } catch {
    return []
  }
}

export async function reportHighscore(game, studentId, name, score, classId) {
  if (!classId) return { qualified: false, rank: null, highscores: [] }
  try {
    const secret = getActiveStudentSessionSecret()
    const res = await fetch(`${API_BASE}/api/highscores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-student-password': secret } : {})
      },
      body: JSON.stringify({ game, studentId, name, score, classId })
    })
    if (!res.ok) return { qualified: false, rank: null, highscores: [] }
    return await res.json()
  } catch {
    return { qualified: false, rank: null, highscores: [] }
  }
}
