import { reduce, add, sub, mul, formatFraction } from './fractionMath'
import { pickFromRotation } from '../../lib/rotationPicker'

function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function rotatePick(key, arr) {
  const indexes = arr.map((_, index) => index)
  const pickedIndex = pickFromRotation(key, indexes)
  const safeIndex = Number.isInteger(pickedIndex) ? pickedIndex : 0
  return arr[safeIndex]
}

function rotateNumber(key, arr) {
  return Number(rotatePick(key, arr))
}

function rotateBoolean(key, arr = [false, true]) {
  return Boolean(rotatePick(key, arr))
}

function makeFractionProblem(text, answer, templateId) {
  return { text, answer, templateId }
}

// Returns { text, answer: { num, den }, templateId }
const SIMPLIFY_FOCUS_LEVEL = 3

function level1() {
  // Addition, same denominator
  const den = rotateNumber('fractions:l1:den', [3, 4, 5, 7, 8, 9, 10])
  const n1 = ri(1, den - 2)
  const n2 = ri(1, Math.max(1, den - n1 - 1))
  const sum = add(n1, den, n2, den)
  return makeFractionProblem(`${n1}/${den} + ${n2}/${den}`, sum, 'l1_same_den_add')
}

function level2() {
  // Subtraction, same denominator
  const den = rotateNumber('fractions:l2:den', [4, 5, 6, 7, 8, 9, 10, 12])
  const n1 = ri(2, den - 1)
  const n2 = ri(1, n1 - 1)
  const diff = sub(n1, den, n2, den)
  return makeFractionProblem(`${n1}/${den} − ${n2}/${den}`, diff, 'l2_same_den_sub')
}

function level3() {
  // Simplify focus level
  const pairs = [
    [2, 4], [2, 6], [3, 6], [4, 8], [2, 8], [3, 9], [4, 10], [6, 8],
    [4, 6], [6, 9], [4, 12], [6, 10], [8, 12], [9, 12], [10, 15], [12, 18],
    [14, 21], [15, 20], [16, 24], [18, 24], [20, 30], [21, 28], [24, 36], [27, 36],
    [28, 42], [30, 45], [32, 40], [35, 49], [36, 48], [40, 56], [42, 54], [45, 60]
  ]
  const [n, d] = rotatePick('fractions:l3:pairs', pairs)
  return makeFractionProblem(`Förenkla: ${n}/${d}`, reduce(n, d), 'l3_simplify_focus')
}

function level4() {
  // Improper fraction -> integer
  const den = rotateNumber('fractions:l4:den', [2, 3, 4, 5, 6, 8])
  const q = ri(2, 8)
  return makeFractionProblem(`${den * q}/${den}`, { num: q, den: 1 }, 'l4_improper_to_int')
}

function level5() {
  // Addition, one denominator multiple of the other
  const pairs = [
    [1, 2, 1, 4], [1, 2, 1, 6], [1, 3, 1, 6], [2, 3, 1, 6],
    [1, 4, 1, 8], [3, 8, 1, 4], [1, 2, 3, 8], [2, 3, 1, 9],
    [1, 3, 2, 9], [3, 5, 1, 10], [5, 6, 1, 3], [3, 4, 1, 12]
  ]
  const [n1, d1, n2, d2] = rotatePick('fractions:l5:pairs', pairs)
  return makeFractionProblem(`${n1}/${d1} + ${n2}/${d2}`, add(n1, d1, n2, d2), 'l5_add_related_den')
}

function level6() {
  // Subtraction, one denominator multiple of the other
  const pairs = [
    [3, 4, 1, 2], [5, 6, 1, 3], [7, 8, 1, 4], [5, 8, 1, 4],
    [5, 6, 1, 2], [7, 8, 3, 8], [2, 3, 1, 6], [5, 9, 1, 3],
    [4, 5, 1, 10], [9, 10, 1, 5], [11, 12, 1, 6], [3, 5, 1, 15]
  ]
  const [n1, d1, n2, d2] = rotatePick('fractions:l6:pairs', pairs)
  return makeFractionProblem(`${n1}/${d1} − ${n2}/${d2}`, sub(n1, d1, n2, d2), 'l6_sub_related_den')
}

function level7() {
  // Addition, different denominators
  const pairs = [
    [1, 2, 1, 3], [1, 3, 1, 4], [1, 2, 1, 5], [2, 3, 1, 4],
    [1, 4, 2, 5], [1, 3, 2, 5], [1, 2, 2, 7], [3, 4, 1, 5],
    [2, 5, 1, 3], [3, 8, 1, 6], [5, 6, 1, 4], [4, 7, 2, 3]
  ]
  const [n1, d1, n2, d2] = rotatePick('fractions:l7:pairs', pairs)
  return makeFractionProblem(`${n1}/${d1} + ${n2}/${d2}`, add(n1, d1, n2, d2), 'l7_add_diff_den')
}

function level8() {
  // Subtraction, different denominators
  const pairs = [
    [3, 4, 1, 3], [5, 6, 1, 4], [2, 3, 1, 4], [4, 5, 1, 3],
    [3, 4, 2, 5], [5, 6, 2, 9], [7, 8, 2, 3], [3, 5, 1, 4],
    [5, 7, 1, 2], [11, 12, 1, 3], [4, 9, 1, 6], [5, 8, 1, 5]
  ]
  const [n1, d1, n2, d2] = rotatePick('fractions:l8:pairs', pairs)
  return makeFractionProblem(`${n1}/${d1} − ${n2}/${d2}`, sub(n1, d1, n2, d2), 'l8_sub_diff_den')
}

function level9() {
  // Fraction x integer
  const cases = [
    [2, 3, 3], [3, 4, 4], [1, 4, 8], [2, 5, 5], [3, 5, 5], [2, 3, 6],
    [1, 3, 9], [3, 8, 8], [4, 7, 7], [5, 6, 12], [3, 10, 20], [7, 9, 18]
  ]
  const [n, d, k] = rotatePick('fractions:l9:cases', cases)
  return makeFractionProblem(`${n}/${d} × ${k}`, mul(n, d, k, 1), 'l9_frac_times_int')
}

function level10() {
  // Fraction x fraction
  const pairs = [
    [1, 2, 2, 3], [2, 3, 3, 4], [1, 3, 3, 5], [2, 5, 5, 6],
    [3, 4, 2, 9], [4, 5, 5, 8], [1, 4, 2, 3], [3, 7, 7, 9],
    [5, 6, 3, 10], [4, 9, 3, 8], [2, 7, 7, 12], [3, 8, 4, 5]
  ]
  const [n1, d1, n2, d2] = rotatePick('fractions:l10:pairs', pairs)
  return makeFractionProblem(`${n1}/${d1} × ${n2}/${d2}`, mul(n1, d1, n2, d2), 'l10_frac_times_frac')
}

function level11() {
  // Addition three terms
  const cases = [
    [[1, 2], [1, 3], [1, 6]],
    [[1, 4], [1, 2], [1, 4]],
    [[1, 3], [1, 3], [1, 3]],
    [[1, 6], [2, 6], [3, 6]],
    [[1, 4], [3, 8], [3, 8]],
    [[1, 3], [1, 4], [5, 12]],
    [[2, 5], [1, 5], [2, 5]],
    [[3, 10], [1, 2], [1, 5]],
    [[1, 8], [3, 8], [1, 2]],
    [[2, 9], [1, 3], [4, 9]]
  ]
  const [[n1, d1], [n2, d2], [n3, d3]] = rotatePick('fractions:l11:cases', cases)
  const step = add(n1, d1, n2, d2)
  const result = add(step.num, step.den, n3, d3)
  return makeFractionProblem(`${n1}/${d1} + ${n2}/${d2} + ${n3}/${d3}`, result, 'l11_three_term_add')
}

function level12() {
  // Mixed: addition + subtraction with different denominators
  const cases = [
    [[1, 2], [2, 3], [1, 4]],
    [[3, 4], [1, 3], [1, 12]],
    [[2, 3], [1, 4], [1, 6]],
    [[1, 2], [1, 3], [1, 4]],
    [[5, 6], [1, 4], [7, 12]],
    [[3, 4], [1, 6], [1, 3]],
    [[7, 8], [2, 5], [1, 4]],
    [[4, 5], [1, 2], [3, 10]],
    [[11, 12], [1, 6], [1, 4]],
    [[5, 9], [2, 3], [4, 9]]
  ]
  const [[n1, d1], [n2, d2], [n3, d3]] = rotatePick('fractions:l12:cases', cases)
  const step = add(n1, d1, n2, d2)
  const result = sub(step.num, step.den, n3, d3)
  return makeFractionProblem(`${n1}/${d1} + ${n2}/${d2} − ${n3}/${d3}`, result, 'l12_mixed_add_sub')
}

const LEVEL_FNS = [
  null,
  level1, level2, level3, level4,
  level5, level6, level7, level8,
  level9, level10, level11, level12
]

function resolveSimplifyRequirement(level, result) {
  const text = String(result?.text || '')
  if (level === SIMPLIFY_FOCUS_LEVEL || text.startsWith('Förenkla')) return true
  if (level <= 3) return false
  const requirementKey = `fractions:l${level}:simplify_requirement`
  if (level <= 6) {
    return rotateBoolean(requirementKey, [false, false, false, true])
  }
  return rotateBoolean(
    requirementKey,
    [false, false, true]
  )
}

export function generateFractionsProblem(skill, level, _options = {}) {
  const lvl = Math.max(1, Math.min(12, Number(level) || 1))
  const fn = LEVEL_FNS[lvl]

  let result = null
  for (let i = 0; i < 10; i++) {
    try {
      result = fn()
      break
    } catch {
      // retry
    }
  }
  if (!result) result = level1()
  const requiresSimplifiedAnswer = resolveSimplifyRequirement(lvl, result)
  const displayText = requiresSimplifiedAnswer && !String(result.text).startsWith('Förenkla')
    ? `${result.text} (Förenkla svaret.)`
    : result.text

  return {
    domain: 'fractions',
    skill: 'fractions',
    level: lvl,
    difficulty: { conceptual_level: lvl },
    display: { text: displayText },
    values: { text: displayText },
    answer: {
      type: 'fraction',
      value: formatFraction(result.answer.num, result.answer.den),
      num: result.answer.num,
      den: result.answer.den
    },
    metadata: {
      template: `level_${lvl}`,
      promptText: displayText,
      varietyTemplate: result.templateId,
      requiresSimplifiedAnswer,
      simplifyFocus: lvl === SIMPLIFY_FOCUS_LEVEL,
      skillTag: `fractions_l${lvl}_${result.templateId}${requiresSimplifiedAnswer ? '_simplify_required' : ''}`
    }
  }
}
