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
  // Level 1: x + c
  () => {
    const x = rand(2, 8), c = rand(2, 6)
    return { expr: `x + ${c}`, vars: { x }, result: x + c, varDisplay: `x = ${x}` }
  },
  // Level 2: c − x
  () => {
    const x = rand(2, 5), c = rand(x + 1, x + 8)
    return { expr: `${c} − x`, vars: { x }, result: c - x, varDisplay: `x = ${x}` }
  },
  // Level 3: 2x
  () => {
    const x = rand(3, 9)
    return { expr: '2x', vars: { x }, result: 2 * x, varDisplay: `x = ${x}` }
  },
  // Level 4: 3x
  () => {
    const x = rand(2, 7)
    return { expr: '3x', vars: { x }, result: 3 * x, varDisplay: `x = ${x}` }
  },
  // Level 5: 2x + c
  () => {
    const x = rand(2, 6), c = rand(1, 5)
    return { expr: `2x + ${c}`, vars: { x }, result: 2 * x + c, varDisplay: `x = ${x}` }
  },
  // Level 6: 3x − c
  () => {
    const x = rand(3, 7), c = rand(1, 4)
    return { expr: `3x − ${c}`, vars: { x }, result: 3 * x - c, varDisplay: `x = ${x}` }
  },
  // Level 7: x + x
  () => {
    const x = rand(4, 10)
    return { expr: 'x + x', vars: { x }, result: 2 * x, varDisplay: `x = ${x}` }
  },
  // Level 8: ax + c (larger coefficients)
  () => {
    const x = rand(3, 8), a = rand(4, 6), c = rand(2, 8)
    return { expr: `${a}x + ${c}`, vars: { x }, result: a * x + c, varDisplay: `x = ${x}` }
  },
  // Level 9: ax − c
  () => {
    const x = rand(4, 9), a = rand(3, 6), c = rand(1, 5)
    return { expr: `${a}x − ${c}`, vars: { x }, result: a * x - c, varDisplay: `x = ${x}` }
  },
  // Level 10: ax + by (two variables)
  () => {
    const x = rand(2, 5), y = rand(2, 5), a = rand(2, 4), b = rand(2, 3)
    return {
      expr: `${a}x + ${b}y`,
      vars: { x, y },
      result: a * x + b * y,
      varDisplay: `x = ${x}, y = ${y}`
    }
  },
  // Level 11: ax − by (two variables, subtraction)
  () => {
    const x = rand(3, 7), y = rand(2, 5), a = rand(3, 5), b = rand(2, 3)
    return {
      expr: `${a}x − ${b}y`,
      vars: { x, y },
      result: a * x - b * y,
      varDisplay: `x = ${x}, y = ${y}`
    }
  },
  // Level 12: ax + by + c (two variables with constant)
  () => {
    const x = rand(2, 5), y = rand(2, 5), a = rand(2, 4), b = rand(2, 3), c = rand(1, 6)
    return {
      expr: `${a}x + ${b}y + ${c}`,
      vars: { x, y },
      result: a * x + b * y + c,
      varDisplay: `x = ${x}, y = ${y}`
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
