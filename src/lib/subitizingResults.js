const STORAGE_KEY = 'sekvens_subitizing_results'

export function recordSubitizingResult(studentId, assignmentId, assignmentTitle, sessionData) {
  if (!studentId || !assignmentId) return

  const results = getSubitizingResults()
  const result = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    studentId,
    assignmentId,
    assignmentTitle,
    totalProblems: sessionData.totalProblems || 0,
    correctAnswers: sessionData.correctAnswers || 0,
    avgTimeMs: sessionData.avgTimeMs || 0,
    successRate: sessionData.successRate || 0,
    completedAt: sessionData.completedAt || Date.now(),
    problemDetails: sessionData.problemDetails || []
  }

  results.push(result)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
  } catch {
    console.warn('Failed to save subitizing result')
  }

  return result
}

export function getSubitizingResults(filters = {}) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const results = JSON.parse(raw)
    if (!Array.isArray(results)) return []

    let filtered = results

    if (filters.studentId) {
      filtered = filtered.filter(r => r.studentId === filters.studentId)
    }
    if (filters.assignmentId) {
      filtered = filtered.filter(r => r.assignmentId === filters.assignmentId)
    }

    return filtered.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
  } catch {
    return []
  }
}

export function clearSubitizingResults() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    console.warn('Failed to clear subitizing results')
  }
}
