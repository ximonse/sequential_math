/**
 * Algebra problem generator — evaluate and simplify, 12 levels each.
 * Targeting mellanstadiet (grades 4–6, approx. ages 10–12).
 */

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Evaluate problems ────────────────────────────────────────────────────────

const EVALUATE_TEMPLATES = [
  // Level 1: n + c, simple addition
  () => {
    const n = rand(2, 8), c = rand(2, 6)
    return { expr: `n + ${c}`, vars: { n }, result: n + c, varDisplay: `n = ${n}` }
  },
  // Level 2: c − n, subtraction
  () => {
    const n = rand(2, 5), c = rand(n + 1, n + 8)
    return { expr: `${c} − n`, vars: { n }, result: c - n, varDisplay: `n = ${n}` }
  },
  // Level 3: 2n
  () => {
    const n = rand(3, 9)
    return { expr: '2n', vars: { n }, result: 2 * n, varDisplay: `n = ${n}` }
  },
  // Level 4: 3n
  () => {
    const n = rand(2, 7)
    return { expr: '3n', vars: { n }, result: 3 * n, varDisplay: `n = ${n}` }
  },
  // Level 5: 2n + c
  () => {
    const n = rand(2, 6), c = rand(1, 5)
    return { expr: `2n + ${c}`, vars: { n }, result: 2 * n + c, varDisplay: `n = ${n}` }
  },
  // Level 6: 3n − c
  () => {
    const n = rand(3, 7), c = rand(1, 4)
    return { expr: `3n − ${c}`, vars: { n }, result: 3 * n - c, varDisplay: `n = ${n}` }
  },
  // Level 7: n + n (same variable twice, hints at 2n)
  () => {
    const n = rand(4, 10)
    return { expr: 'n + n', vars: { n }, result: 2 * n, varDisplay: `n = ${n}` }
  },
  // Level 8: an + c (larger coefficients)
  () => {
    const n = rand(3, 8), a = rand(4, 6), c = rand(2, 8)
    return { expr: `${a}n + ${c}`, vars: { n }, result: a * n + c, varDisplay: `n = ${n}` }
  },
  // Level 9: an − c (larger numbers)
  () => {
    const n = rand(4, 9), a = rand(3, 6), c = rand(1, 5)
    return { expr: `${a}n − ${c}`, vars: { n }, result: a * n - c, varDisplay: `n = ${n}` }
  },
  // Level 10: am + bn (two variables)
  () => {
    const m = rand(2, 5), n = rand(2, 5), a = rand(2, 4), b = rand(2, 3)
    return {
      expr: `${a}m + ${b}n`,
      vars: { m, n },
      result: a * m + b * n,
      varDisplay: `m = ${m}, n = ${n}`
    }
  },
  // Level 11: am − bn (two variables, subtraction)
  () => {
    const m = rand(3, 7), n = rand(2, 5), a = rand(3, 5), b = rand(2, 3)
    return {
      expr: `${a}m − ${b}n`,
      vars: { m, n },
      result: a * m - b * n,
      varDisplay: `m = ${m}, n = ${n}`
    }
  },
  // Level 12: am + bn + c (two variables with constant)
  () => {
    const m = rand(2, 5), n = rand(2, 5), a = rand(2, 4), b = rand(2, 3), c = rand(1, 6)
    return {
      expr: `${a}m + ${b}n + ${c}`,
      vars: { m, n },
      result: a * m + b * n + c,
      varDisplay: `m = ${m}, n = ${n}`
    }
  }
]

// ── Simplify problems ────────────────────────────────────────────────────────

const SIMPLIFY_TEMPLATES = [
  // Level 1: n + n → 2n
  () => ({ expr: 'n + n', correct: '2n', alternatives: [] }),
  // Level 2: x + x + x → 3x
  () => ({ expr: 'x + x + x', correct: '3x', alternatives: [] }),
  // Level 3: 2x + x → 3x
  () => ({ expr: '2x + x', correct: '3x', alternatives: [] }),
  // Level 4: ax + bx → cx
  () => {
    const a = rand(2, 5), b = rand(2, 4)
    return { expr: `${a}x + ${b}x`, correct: `${a + b}x`, alternatives: [] }
  },
  // Level 5: x + c + x → 2x + c
  () => {
    const c = rand(2, 8)
    return { expr: `x + ${c} + x`, correct: `2x + ${c}`, alternatives: [] }
  },
  // Level 6: ax + c + bx → (a+b)x + c
  () => {
    const a = rand(2, 4), b = rand(1, 3), c = rand(1, 7)
    return { expr: `${a}x + ${c} + ${b}x`, correct: `${a + b}x + ${c}`, alternatives: [] }
  },
  // Level 7: ax + c + bx + d → (a+b)x + (c+d)
  () => {
    const a = rand(2, 4), b = rand(1, 3), c = rand(2, 6), d = rand(1, 5)
    return {
      expr: `${a}x + ${c} + ${b}x + ${d}`,
      correct: `${a + b}x + ${c + d}`,
      alternatives: []
    }
  },
  // Level 8: ax + by + cx → (a+c)x + by
  () => {
    const a = rand(2, 4), b = rand(2, 3), c = rand(1, 3)
    return {
      expr: `${a}x + ${b}y + ${c}x`,
      correct: `${a + c}x + ${b}y`,
      alternatives: []
    }
  },
  // Level 9: ax + by + cx + dy → (a+c)x + (b+d)y
  () => {
    const a = rand(2, 3), b = rand(2, 3), c = rand(1, 2), d = rand(1, 2)
    return {
      expr: `${a}x + ${b}y + ${c}x + ${d}y`,
      correct: `${a + c}x + ${b + d}y`,
      alternatives: []
    }
  },
  // Level 10: a(x + b) → ax + ab  (distribution)
  () => {
    const a = rand(2, 4), b = rand(2, 5)
    return { expr: `${a}(x + ${b})`, correct: `${a}x + ${a * b}`, alternatives: [] }
  },
  // Level 11: a(x + b) + cx → (a+c)x + ab
  () => {
    const a = rand(2, 3), b = rand(2, 4), c = rand(1, 3)
    return {
      expr: `${a}(x + ${b}) + ${c}x`,
      correct: `${a + c}x + ${a * b}`,
      alternatives: []
    }
  },
  // Level 12: a(x + b) + c(x + d) → (a+c)x + (ab+cd)
  () => {
    const a = rand(2, 3), b = rand(1, 3), c = rand(1, 2), d = rand(1, 3)
    return {
      expr: `${a}(x + ${b}) + ${c}(x + ${d})`,
      correct: `${a + c}x + ${a * b + c * d}`,
      alternatives: []
    }
  }
]

// ── Public API ───────────────────────────────────────────────────────────────

export function generateAlgebraProblem(skill, level) {
  const idx = Math.max(0, Math.min(11, Math.round(Number(level || 1)) - 1))

  if (skill === 'algebra_simplify') {
    const tpl = SIMPLIFY_TEMPLATES[idx]()
    return {
      domain: 'algebra',
      skill: 'algebra_simplify',
      type: 'algebra_simplify',
      level: idx + 1,
      display: { type: 'expression', text: `Förenkla: ${tpl.expr}` },
      values: { expression: tpl.expr },
      answer: { type: 'expression', correct: tpl.correct, alternatives: tpl.alternatives },
      result: null,
      generated_at: Date.now()
    }
  }

  // algebra_evaluate (default)
  const tpl = EVALUATE_TEMPLATES[idx]()
  return {
    domain: 'algebra',
    skill: 'algebra_evaluate',
    type: 'algebra_evaluate',
    level: idx + 1,
    display: {
      type: 'expression',
      text: `Beräkna värdet av ${tpl.expr} när ${tpl.varDisplay}`
    },
    values: { expression: tpl.expr, variables: tpl.vars, varDisplay: tpl.varDisplay },
    answer: { type: 'number', correct: tpl.result },
    result: tpl.result,
    generated_at: Date.now()
  }
}

export function normalizeAlgebraLegacyProblem(problem) {
  return {
    ...problem,
    domain: 'algebra',
    skill: problem.skill || problem.type || 'algebra_evaluate',
    level: Math.max(1, Math.min(12, Math.round(Number(problem?.level || 1)))),
    generated_at: Number(problem?.generated_at || Date.now())
  }
}
