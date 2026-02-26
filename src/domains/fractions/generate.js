import { gcd, reduce, add, sub, mul, formatFraction } from './fractionMath'

function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Returns { text, answer: { num, den } }

function level1() {
  // Addition, same denominator, result already reduced (use prime denominators)
  const den = pick([3, 4, 5, 7, 8])
  const n1 = ri(1, den - 2), n2 = ri(1, den - n1 - 1 || 1)
  const sum = add(n1, den, n2, den)
  return {
    text: `${n1}/${den} + ${n2}/${den}`,
    answer: sum
  }
}

function level2() {
  // Subtraction, same denominator
  const den = pick([4, 5, 6, 7, 8])
  const n1 = ri(2, den - 1), n2 = ri(1, n1 - 1)
  const diff = sub(n1, den, n2, den)
  return {
    text: `${n1}/${den} − ${n2}/${den}`,
    answer: diff
  }
}

function level3() {
  // Simplify a fraction
  const pairs = [
    [2, 4], [2, 6], [3, 6], [4, 8], [2, 8], [3, 9],
    [4, 6], [6, 9], [4, 10], [6, 8], [4, 12], [6, 10]
  ]
  const [n, d] = pick(pairs)
  return {
    text: `Förenkla: ${n}/${d}`,
    answer: reduce(n, d)
  }
}

function level4() {
  // Improper fraction → integer
  const den = pick([2, 3, 4, 5])
  const q = ri(2, 6)
  return {
    text: `${den * q}/${den}`,
    answer: { num: q, den: 1 }
  }
}

function level5() {
  // Addition, one denominator multiple of the other
  const pairs = [
    [1, 2, 1, 4], [1, 2, 1, 6], [1, 3, 1, 6],
    [2, 3, 1, 6], [1, 4, 1, 8], [3, 8, 1, 4],
    [1, 2, 3, 8], [2, 3, 1, 9], [1, 3, 2, 9]
  ]
  const [n1, d1, n2, d2] = pick(pairs)
  return {
    text: `${n1}/${d1} + ${n2}/${d2}`,
    answer: add(n1, d1, n2, d2)
  }
}

function level6() {
  // Subtraction, one denominator multiple of the other
  const pairs = [
    [3, 4, 1, 2], [5, 6, 1, 3], [7, 8, 1, 4],
    [5, 8, 1, 4], [5, 6, 1, 2], [7, 8, 3, 8],
    [2, 3, 1, 6], [5, 9, 1, 3]
  ]
  const [n1, d1, n2, d2] = pick(pairs)
  return {
    text: `${n1}/${d1} − ${n2}/${d2}`,
    answer: sub(n1, d1, n2, d2)
  }
}

function level7() {
  // Addition, different denominators (simple pairs)
  const pairs = [
    [1, 2, 1, 3], [1, 3, 1, 4], [1, 2, 1, 5],
    [2, 3, 1, 4], [1, 4, 2, 5], [1, 3, 2, 5],
    [1, 2, 2, 7], [3, 4, 1, 5]
  ]
  const [n1, d1, n2, d2] = pick(pairs)
  return {
    text: `${n1}/${d1} + ${n2}/${d2}`,
    answer: add(n1, d1, n2, d2)
  }
}

function level8() {
  // Subtraction, different denominators
  const pairs = [
    [3, 4, 1, 3], [5, 6, 1, 4], [2, 3, 1, 4],
    [4, 5, 1, 3], [3, 4, 2, 5], [5, 6, 2, 9],
    [7, 8, 2, 3], [3, 5, 1, 4]
  ]
  const [n1, d1, n2, d2] = pick(pairs)
  return {
    text: `${n1}/${d1} − ${n2}/${d2}`,
    answer: sub(n1, d1, n2, d2)
  }
}

function level9() {
  // Fraction × integer → integer result
  const cases = [
    [2, 3, 3], [3, 4, 4], [1, 4, 8], [2, 5, 5],
    [3, 5, 5], [2, 3, 6], [1, 3, 9], [3, 8, 8]
  ]
  const [n, d, k] = pick(cases)
  return {
    text: `${n}/${d} × ${k}`,
    answer: mul(n, d, k, 1)
  }
}

function level10() {
  // Fraction × fraction
  const pairs = [
    [1, 2, 2, 3], [2, 3, 3, 4], [1, 3, 3, 5],
    [2, 5, 5, 6], [3, 4, 2, 9], [4, 5, 5, 8],
    [1, 4, 2, 3], [3, 7, 7, 9]
  ]
  const [n1, d1, n2, d2] = pick(pairs)
  return {
    text: `${n1}/${d1} × ${n2}/${d2}`,
    answer: mul(n1, d1, n2, d2)
  }
}

function level11() {
  // Addition three terms (mixed denominators summing to integer or simple fraction)
  const cases = [
    [[1, 2], [1, 3], [1, 6]],
    [[1, 4], [1, 2], [1, 4]],
    [[1, 3], [1, 3], [1, 3]],
    [[1, 6], [2, 6], [3, 6]],
    [[1, 4], [3, 8], [3, 8]],
    [[1, 3], [1, 4], [5, 12]]
  ]
  const [[n1, d1], [n2, d2], [n3, d3]] = pick(cases)
  const step = add(n1, d1, n2, d2)
  const result = add(step.num, step.den, n3, d3)
  return {
    text: `${n1}/${d1} + ${n2}/${d2} + ${n3}/${d3}`,
    answer: result
  }
}

function level12() {
  // Mixed: addition + subtraction with different denominators
  const cases = [
    [[1, 2], [2, 3], [1, 4]],
    [[3, 4], [1, 3], [1, 12]],
    [[2, 3], [1, 4], [1, 6]],
    [[1, 2], [1, 3], [1, 4]],
    [[5, 6], [1, 4], [7, 12]],
    [[3, 4], [1, 6], [1, 3]]
  ]
  const [[n1, d1], [n2, d2], [n3, d3]] = pick(cases)
  const step = add(n1, d1, n2, d2)
  const result = sub(step.num, step.den, n3, d3)
  return {
    text: `${n1}/${d1} + ${n2}/${d2} − ${n3}/${d3}`,
    answer: result
  }
}

const LEVEL_FNS = [
  null,
  level1, level2, level3, level4,
  level5, level6, level7, level8,
  level9, level10, level11, level12
]

export function generateFractionsProblem(skill, level, _options = {}) {
  const lvl = Math.max(1, Math.min(12, Number(level) || 1))
  const fn = LEVEL_FNS[lvl]

  let result = null
  for (let i = 0; i < 10; i++) {
    try { result = fn(); break } catch { /* retry */ }
  }
  if (!result) result = level1()

  return {
    domain: 'fractions',
    skill: 'fractions',
    level: lvl,
    difficulty: { conceptual_level: lvl },
    display: { text: result.text },
    answer: {
      type: 'fraction',
      value: formatFraction(result.answer.num, result.answer.den),
      num: result.answer.num,
      den: result.answer.den
    },
    metadata: { template: `level_${lvl}` }
  }
}
