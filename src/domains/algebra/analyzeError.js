/**
 * Felanalys för algebrauppgifter.
 *
 * Vanliga missuppfattningar:
 * - evaluate: glömmer koefficient (svarar n istf 2n), adderar istf multiplicerar
 * - simplify: kombinerar lika termer fel, glömmer konstant, kombinerar olika termer
 */

import { evaluateAlgebraProblem } from './evaluate'

function near(a, b, tol = 0.5) {
  return Math.abs(a - b) <= tol
}

function analyzeEvaluateError(problem, studentAnswer) {
  const expected = Number(problem?.answer?.correct ?? problem?.result)
  const answer = Number(studentAnswer)
  const vars = problem?.values?.variables || {}
  const varValues = Object.values(vars).map(Number).filter(Number.isFinite)
  const firstVar = varValues[0]

  if (!Number.isFinite(answer) || !Number.isFinite(expected)) {
    return { category: 'knowledge', patterns: ['no_answer'], detail: 'Inget svar angivet.' }
  }

  // Glömde koefficient — svarade med variabelns värde direkt
  if (Number.isFinite(firstVar) && near(answer, firstVar)) {
    return {
      category: 'misconception',
      patterns: ['forgot_coefficient'],
      detail: 'Svaret är variabelns värde utan koefficient — missade att multiplicera.'
    }
  }

  // Adderade istf multiplicerade (2n → 2+n istf 2×n)
  if (varValues.length === 1 && Number.isFinite(firstVar)) {
    const level = Number(problem?.level || 1)
    if (level >= 3 && near(answer, 2 + firstVar)) {
      return {
        category: 'misconception',
        patterns: ['added_instead_of_multiplied'],
        detail: '2n tolkades som 2 + n istf 2 × n.'
      }
    }
    if (level >= 4 && near(answer, 3 + firstVar)) {
      return {
        category: 'misconception',
        patterns: ['added_instead_of_multiplied'],
        detail: '3n tolkades som 3 + n istf 3 × n.'
      }
    }
  }

  // Kvadrerade fel — n² tolkades som 2n
  const expr = String(problem?.values?.expression || '')
  if (expr.includes('²') && Number.isFinite(firstVar)) {
    if (near(answer, 2 * firstVar)) {
      return {
        category: 'misconception',
        patterns: ['square_as_double'],
        detail: 'n² tolkades som 2n istf n × n.'
      }
    }
  }

  return {
    category: 'knowledge',
    patterns: ['calculation_error'],
    detail: 'Fel beräkning utan identifierat mönster.'
  }
}

function analyzeSimplifyError(problem, studentAnswer) {
  const correct = String(problem?.answer?.correct || '')
  const answer = String(studentAnswer || '').trim()

  if (!answer) {
    return { category: 'knowledge', patterns: ['no_answer'], detail: 'Inget svar angivet.' }
  }

  // Kombinerade INTE liknande termer (behöll uttrycket som det är)
  const expr = String(problem?.values?.expression || '')
  if (answer.replace(/\s+/g, '') === expr.replace(/\s+/g, '')) {
    return {
      category: 'misconception',
      patterns: ['did_not_simplify'],
      detail: 'Uttrycket förblev oförenklat — liknande termer kombinerades inte.'
    }
  }

  // Glömde konstanten (t.ex. "3x + 5" → svarade "3x")
  const hasConstant = /\d+$/.test(correct.replace(/\s+/g, ''))
  if (hasConstant && !/\d+$/.test(answer.replace(/\s+/g, ''))) {
    return {
      category: 'misconception',
      patterns: ['forgot_constant'],
      detail: 'Glömde att ta med konstanten i svaret.'
    }
  }

  // Kombinerade OLIKA termer (t.ex. 2x + 3 → 5x eller 5)
  if (!answer.includes('x') && correct.includes('x')) {
    return {
      category: 'misconception',
      patterns: ['combined_unlike_terms'],
      detail: 'Variabeltermer och konstanter verkar ha adderats direkt.'
    }
  }

  return {
    category: 'knowledge',
    patterns: ['simplify_error'],
    detail: 'Fel förenkling utan identifierat mönster.'
  }
}

export function analyzeAlgebraError(problem, studentAnswer) {
  const evaluation = evaluateAlgebraProblem(problem, studentAnswer)
  if (evaluation.correct) {
    return { category: 'none', patterns: [], detail: '' }
  }

  const skill = String(problem?.skill || problem?.type || '')

  if (skill === 'algebra_simplify') {
    return analyzeSimplifyError(problem, studentAnswer)
  }

  return analyzeEvaluateError(problem, studentAnswer)
}
