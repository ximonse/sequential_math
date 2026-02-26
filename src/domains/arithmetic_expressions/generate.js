function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Find a divisor pair (a, b) where b divides a and a/b is an integer
function divisorPair(maxA = 20, maxB = 9) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const b = ri(2, maxB)
    const quotient = ri(2, Math.floor(maxA / b))
    const a = b * quotient
    if (a <= maxA) return { a, b }
  }
  return { a: 12, b: 3 }
}

function makeLevel1() {
  // a × b + c
  const a = ri(2, 5), b = ri(2, 5), c = ri(1, 9)
  return { text: `${a} × ${b} + ${c}`, answer: a * b + c }
}

function makeLevel2() {
  // a × b − c (answer ≥ 0) or a − b × c (answer ≥ 0)
  if (Math.random() < 0.5) {
    const a = ri(2, 5), b = ri(2, 5)
    const prod = a * b
    const c = ri(1, prod)
    return { text: `${a} × ${b} − ${c}`, answer: prod - c }
  } else {
    const b = ri(2, 4), c = ri(2, 4)
    const prod = b * c
    const a = ri(prod, prod + 9)
    return { text: `${a} − ${b} × ${c}`, answer: a - prod }
  }
}

function makeLevel3() {
  // a ÷ b + c
  const { a, b } = divisorPair(24, 8)
  const c = ri(1, 9)
  return { text: `${a} ÷ ${b} + ${c}`, answer: a / b + c }
}

function makeLevel4() {
  // a − b ÷ c (answer ≥ 0)
  const { a: b, b: c } = divisorPair(20, 8)
  const quot = b / c
  const a = ri(quot, quot + 10)
  return { text: `${a} − ${b} ÷ ${c}`, answer: a - quot }
}

function makeLevel5() {
  // a × b + c × d
  const a = ri(2, 5), b = ri(2, 5), c = ri(2, 5), d = ri(2, 5)
  return { text: `${a} × ${b} + ${c} × ${d}`, answer: a * b + c * d }
}

function makeLevel6() {
  // (a + b) × c
  const a = ri(1, 8), b = ri(1, 8), c = ri(2, 6)
  return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c }
}

function makeLevel7() {
  if (Math.random() < 0.5) {
    // (a − b) × c, a > b
    const b = ri(1, 7), extra = ri(1, 5), a = b + extra
    const c = ri(2, 6)
    return { text: `(${a} − ${b}) × ${c}`, answer: (a - b) * c }
  } else {
    // (a + b) ÷ c
    const c = ri(2, 6)
    const sum = c * ri(2, 6)
    const a = ri(1, sum - 1), b = sum - a
    return { text: `(${a} + ${b}) ÷ ${c}`, answer: sum / c }
  }
}

function makeLevel8() {
  // a × b − c × d (answer ≥ 0)
  for (let i = 0; i < 20; i++) {
    const a = ri(2, 6), b = ri(2, 6), c = ri(2, 5), d = ri(2, 5)
    const ans = a * b - c * d
    if (ans >= 0) return { text: `${a} × ${b} − ${c} × ${d}`, answer: ans }
  }
  return { text: `5 × 4 − 3 × 2`, answer: 14 }
}

function makeLevel9() {
  // (a + b) × c − d
  const a = ri(1, 7), b = ri(1, 7), c = ri(2, 5)
  const prod = (a + b) * c
  const d = ri(1, prod)
  return { text: `(${a} + ${b}) × ${c} − ${d}`, answer: prod - d }
}

function makeLevel10() {
  // (a + b) × (c − d), c > d
  const a = ri(1, 6), b = ri(1, 6)
  const d = ri(1, 5), extra = ri(1, 5), c = d + extra
  return { text: `(${a} + ${b}) × (${c} − ${d})`, answer: (a + b) * (c - d) }
}

function makeLevel11() {
  // a × (b + c) − d × e (answer ≥ 0)
  for (let i = 0; i < 20; i++) {
    const a = ri(2, 5), b = ri(1, 6), c = ri(1, 6)
    const d = ri(2, 4), e = ri(2, 4)
    const ans = a * (b + c) - d * e
    if (ans >= 0) return { text: `${a} × (${b} + ${c}) − ${d} × ${e}`, answer: ans }
  }
  return { text: `3 × (2 + 4) − 2 × 5`, answer: 8 }
}

function makeLevel12() {
  // (a + b) ÷ c + d × e
  const { a: sum, b: c } = divisorPair(24, 6)
  const a = ri(1, sum - 1), b = sum - a
  const d = ri(2, 5), e = ri(2, 5)
  return { text: `(${a} + ${b}) ÷ ${c} + ${d} × ${e}`, answer: sum / c + d * e }
}

const LEVEL_MAKERS = [
  null,
  makeLevel1, makeLevel2, makeLevel3, makeLevel4,
  makeLevel5, makeLevel6, makeLevel7, makeLevel8,
  makeLevel9, makeLevel10, makeLevel11, makeLevel12
]

export function generateArithmeticExpressionsProblem(skill, level, _options = {}) {
  const lvl = Math.max(1, Math.min(12, Number(level) || 1))
  const maker = LEVEL_MAKERS[lvl]

  let result = null
  for (let i = 0; i < 10; i++) {
    try { result = maker(); break } catch { /* retry */ }
  }
  if (!result) result = makeLevel1()

  return {
    domain: 'arithmetic_expressions',
    skill: 'arithmetic_expressions',
    level: lvl,
    difficulty: { conceptual_level: lvl },
    display: { text: result.text },
    answer: { type: 'number', value: result.answer },
    result: result.answer,
    metadata: { promptText: result.text, template: `level_${lvl}` }
  }
}
