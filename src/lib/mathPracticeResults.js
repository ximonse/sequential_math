import { mergeWorkspaceItems, saveTeacherWorkspacePatch } from './teacherWorkspaceSync'

const RESULTS_KEY = 'mathapp_practice_results'

let resultsCache = []

function readLegacyResults() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(item => normalizeResult(item)).filter(Boolean) : []
  } catch {
    return []
  }
}

function readResults() {
  return resultsCache.map(item => ({ ...item }))
}

function writeResults(results, { sync = true } = {}) {
  resultsCache = Array.isArray(results) ? results.map(item => ({ ...item })) : []
  if (sync) void saveTeacherWorkspacePatch({ mathPracticeResults: resultsCache })
}

function makeResultId() {
  return 'res_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

function normalizeResult(input) {
  if (!input || typeof input !== 'object') return null

  const id = String(input.id || '').trim()
  const studentId = String(input.studentId || '').trim()
  const assignmentId = String(input.assignmentId || '').trim()
  const assignmentTitle = String(input.assignmentTitle || '').trim()
  const completedAt = Number(input.completedAt || 0) > 0 ? Number(input.completedAt) : Date.now()

  const totalProblems = Math.max(0, Number(input.totalProblems) || 0)
  const correctAnswers = Math.max(0, Math.min(totalProblems, Number(input.correctAnswers) || 0))
  const successRate = totalProblems > 0 ? correctAnswers / totalProblems : 0

  const totalTimeMs = Math.max(0, Number(input.totalTimeMs) || 0)
  const avgTimeMs = totalProblems > 0 ? totalTimeMs / totalProblems : 0

  const problemDetails = Array.isArray(input.problemDetails) ? input.problemDetails.map(normalizeProblemDetail) : []
  const operation = String(input.operation || 'mixed').trim()

  return {
    id,
    studentId,
    assignmentId,
    assignmentTitle,
    completedAt,
    totalProblems,
    correctAnswers,
    successRate,
    totalTimeMs,
    avgTimeMs,
    problemDetails,
    operation
  }
}

function normalizeProblemDetail(detail) {
  if (!detail || typeof detail !== 'object') return null
  return {
    problem: String(detail.problem || '').trim(),
    studentAnswer: String(detail.studentAnswer || '').trim(),
    correctAnswer: String(detail.correctAnswer || '').trim(),
    isCorrect: Boolean(detail.isCorrect),
    timeMs: Math.max(0, Number(detail.timeMs) || 0)
  }
}

export function recordMathPracticeResult(studentId, assignmentId, assignmentTitle, sessionData) {
  if (!studentId || !assignmentId || !sessionData) return null

  const { totalProblems, correctAnswers, totalTimeMs, problemDetails, operations } = sessionData
  const operation = operations && operations.length === 1 ? operations[0] : 'mixed'

  const result = normalizeResult({
    id: makeResultId(),
    studentId,
    assignmentId,
    assignmentTitle,
    completedAt: Date.now(),
    totalProblems,
    correctAnswers,
    totalTimeMs,
    problemDetails: problemDetails || [],
    operation
  })

  if (!result) return null

  const results = readResults()
  results.unshift(result)
  writeResults(results)
  return result
}

export function getMathPracticeResults(filters = {}) {
  const { studentId, assignmentId, limit = Infinity } = filters
  let results = readResults()

  if (studentId) {
    results = results.filter(r => r.studentId === studentId)
  }
  if (assignmentId) {
    results = results.filter(r => r.assignmentId === assignmentId)
  }

  return results.slice(0, limit)
}

export function getMathPracticeResultById(resultId) {
  if (!resultId) return null
  return readResults().find(r => r.id === resultId) || null
}

export function getMathPracticeResultsForStudent(studentId) {
  if (!studentId) return []
  return getMathPracticeResults({ studentId })
}

export function getMathPracticeResultsForAssignment(assignmentId) {
  if (!assignmentId) return []
  return getMathPracticeResults({ assignmentId })
}

export function hydrateMathPracticeResultsFromServer(workspace) {
  const serverResults = Object.hasOwn(workspace || {}, 'mathPracticeResults') ? workspace.mathPracticeResults : []
  const results = mergeWorkspaceItems(readLegacyResults(), serverResults)
  writeResults(results, { sync: false })
  void saveTeacherWorkspacePatch({ mathPracticeResults: results })
  return results
}

export function clearAllMathPracticeResults() {
  writeResults([])
}
