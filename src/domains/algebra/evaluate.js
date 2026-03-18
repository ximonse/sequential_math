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

function normalizeImplicitUnitCoefficients(raw) {
  return normalizeExpressionString(raw).replace(/(^|[+-])1(?=[a-z])/g, '$1')
}

function hasExplicitUnitCoefficient(raw) {
  return /(^|[+-])1(?=[a-z])/i.test(normalizeExpressionString(raw))
}

function strictExpressionEquals(a, b) {
  return normalizeExpressionString(a) === normalizeExpressionString(b)
}

function termOrderEquals(a, b) {
  const na = normalizeExpressionString(a)
  const nb = normalizeExpressionString(b)
  const termsA = splitTerms(na)
  const termsB = splitTerms(nb)
  if (termsA.length !== termsB.length) return false
  const sortedA = [...termsA].map(t => t.replace(/^\+/, '')).sort()
  const sortedB = [...termsB].map(t => t.replace(/^\+/, '')).sort()
  return sortedA.every((t, i) => t === sortedB[i])
}

function expressionEquals(a, b) {
  return strictExpressionEquals(a, b) || termOrderEquals(a, b)
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
    const studentExpression = String(studentAnswer || '')
    const alternatives = Array.isArray(problem?.answer?.alternatives)
      ? problem.answer.alternatives
      : []
    const isStrictMatch = strictExpressionEquals(correct, studentExpression)
      || alternatives.some(alt => strictExpressionEquals(alt, studentExpression))

    if (isStrictMatch) {
      return {
        correct: true,
        correctAnswer: correct,
        studentAnswer: studentExpression,
        isReasonable: true,
        isPartial: false,
        absError: null,
        relativeError: null
      }
    }

    const isReorderedMatch = termOrderEquals(correct, studentExpression)
      || alternatives.some(alt => termOrderEquals(alt, studentExpression))

    if (isReorderedMatch) {
      return {
        correct: true,
        correctAnswer: correct,
        studentAnswer: studentExpression,
        isReasonable: true,
        isPartial: false,
        hint: `Tips: i algebra skriver man variabeltermen först: ${correct}`,
        absError: null,
        relativeError: null
      }
    }

    const isUnitCoefficientVariant = hasExplicitUnitCoefficient(studentExpression) && (
      expressionEquals(normalizeImplicitUnitCoefficients(correct), normalizeImplicitUnitCoefficients(studentExpression))
      || alternatives.some(alt => expressionEquals(
        normalizeImplicitUnitCoefficients(alt),
        normalizeImplicitUnitCoefficients(studentExpression)
      ))
    )

    if (isUnitCoefficientVariant) {
      return {
        correct: true,
        correctAnswer: correct,
        studentAnswer: studentExpression,
        isReasonable: true,
        isPartial: true,
        partialCode: 'explicit_unit_coefficient',
        partialDetail: 'Rätt värde, men skriv utan 1 framför variabeln.',
        absError: null,
        relativeError: null
      }
    }

    return {
      correct: false,
      correctAnswer: correct,
      studentAnswer: studentExpression,
      isReasonable: true,
      isPartial: false,
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
    isPartial: false,
    absError: Number.isFinite(numericAnswer) ? Math.abs(numericAnswer - expected) : null,
    relativeError: null
  }
}
