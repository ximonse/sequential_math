/**
 * Evaluerar elevsvaret för algebrauppgifter.
 * - algebra_evaluate: numerisk jämförelse
 * - algebra_simplify: normaliserat stränguttryck
 */

function normalizeExpressionString(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/×/g, '')
    .replace(/·/g, '')
    .replace(/\*/g, '')
    // Normalisera minustecken
    .replace(/−/g, '-')
}

function expressionEquals(a, b) {
  const na = normalizeExpressionString(a)
  const nb = normalizeExpressionString(b)
  if (na === nb) return true

  // Tillåt alternativ ordning av termer: "2 + 3x" === "3x + 2"
  const termsA = splitTerms(na)
  const termsB = splitTerms(nb)
  if (termsA.length !== termsB.length) return false
  const sortedA = [...termsA].sort()
  const sortedB = [...termsB].sort()
  return sortedA.every((t, i) => t === sortedB[i])
}

function splitTerms(expr) {
  // Dela på + och - (håll minus som del av termen)
  const parts = []
  let current = ''
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i]
    if ((ch === '+' || ch === '-') && i > 0) {
      if (current) parts.push(current)
      current = ch
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)
  return parts
}

export function evaluateAlgebraProblem(problem, studentAnswer) {
  const answerType = String(problem?.answer?.type || 'number')

  if (answerType === 'expression') {
    const correct = String(problem?.answer?.correct || '')
    const alternatives = Array.isArray(problem?.answer?.alternatives)
      ? problem.answer.alternatives
      : []
    const isCorrect = expressionEquals(correct, studentAnswer)
      || alternatives.some(alt => expressionEquals(alt, studentAnswer))
    return {
      correct: isCorrect,
      correctAnswer: correct,
      studentAnswer: String(studentAnswer || ''),
      isReasonable: true,
      absError: null,
      relativeError: null
    }
  }

  // Numeric answer (algebra_evaluate)
  const expected = Number(problem?.answer?.correct ?? problem?.result)
  const numericAnswer = Number(studentAnswer)
  const correct = Number.isFinite(numericAnswer)
    && Number.isFinite(expected)
    && Math.abs(numericAnswer - expected) < 0.0001

  return {
    correct,
    correctAnswer: String(expected),
    studentAnswer: numericAnswer,
    isReasonable: Number.isFinite(numericAnswer),
    absError: Number.isFinite(numericAnswer) ? Math.abs(numericAnswer - expected) : null,
    relativeError: null
  }
}
