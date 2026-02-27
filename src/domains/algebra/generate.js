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
  // Level 3: x + x (bridge: shows that adding a variable to itself = doubling)
  () => {
    const x = rand(4, 10)
    return { expr: 'x + x', vars: { x }, result: 2 * x, varDisplay: `x = ${x}` }
  },
  // Level 4: 2x (formalizes the x + x concept)
  () => {
    const x = rand(3, 9)
    return { expr: '2x', vars: { x }, result: 2 * x, varDisplay: `x = ${x}` }
  },
  // Level 5: 3x
  () => {
    const x = rand(2, 7)
    return { expr: '3x', vars: { x }, result: 3 * x, varDisplay: `x = ${x}` }
  },
  // Level 6: 2x + c
  () => {
    const x = rand(2, 6), c = rand(1, 5)
    return { expr: `2x + ${c}`, vars: { x }, result: 2 * x + c, varDisplay: `x = ${x}` }
  },
  // Level 7: 3x − c
  () => {
    const x = rand(3, 7), c = rand(1, 4)
    return { expr: `3x − ${c}`, vars: { x }, result: 3 * x - c, varDisplay: `x = ${x}` }
  },
  // Level 8: ax + c (larger coefficients, a = 4–6)
  () => {
    const x = rand(3, 8), a = rand(4, 6), c = rand(2, 8)
    return { expr: `${a}x + ${c}`, vars: { x }, result: a * x + c, varDisplay: `x = ${x}` }
  },
  // Level 9: ax − c (larger coefficients)
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

function pickVar() {
  return pick(['x', 'y', 'a', 'b'])
}

const SIMPLIFY_TEMPLATES = [
  // Level 1: v + v → 2v
  () => { const v = pickVar(); return { expr: `${v} + ${v}`, correct: `2${v}`, alternatives: [] } },
  // Level 2: v + v + v → 3v  OR  2v + v → 3v (merged, random)
  () => {
    const v = pickVar()
    if (Math.random() < 0.5) {
      return { expr: `${v} + ${v} + ${v}`, correct: `3${v}`, alternatives: [] }
    }
    return { expr: `2${v} + ${v}`, correct: `3${v}`, alternatives: [] }
  },
  // Level 3: cv + dv → (c+d)v
  () => {
    const v = pickVar(), c = rand(2, 5), d = rand(2, 4)
    return { expr: `${c}${v} + ${d}${v}`, correct: `${c + d}${v}`, alternatives: [] }
  },
  // Level 4: v + k + v → 2v + k (introduces constants)
  () => {
    const v = pickVar(), k = rand(2, 8)
    return { expr: `${v} + ${k} + ${v}`, correct: `2${v} + ${k}`, alternatives: [] }
  },
  // Level 5: cv + k + dv → (c+d)v + k
  () => {
    const v = pickVar(), c = rand(2, 4), d = rand(1, 3), k = rand(1, 7)
    return { expr: `${c}${v} + ${k} + ${d}${v}`, correct: `${c + d}${v} + ${k}`, alternatives: [] }
  },
  // Level 6: cv + k + dv + m → (c+d)v + (k+m)
  () => {
    const v = pickVar(), c = rand(2, 4), d = rand(1, 3), k = rand(2, 6), m = rand(1, 5)
    return {
      expr: `${c}${v} + ${k} + ${d}${v} + ${m}`,
      correct: `${c + d}${v} + ${k + m}`,
      alternatives: []
    }
  },
  // Level 7: ax + by + cx → (a+c)x + by (two variables)
  () => {
    const a = rand(2, 4), b = rand(2, 3), c = rand(1, 3)
    return {
      expr: `${a}x + ${b}y + ${c}x`,
      correct: `${a + c}x + ${b}y`,
      alternatives: []
    }
  },
  // Level 8: ax + by + cx + dy → (a+c)x + (b+d)y (full two-variable)
  () => {
    const a = rand(2, 3), b = rand(2, 3), c = rand(1, 2), d = rand(1, 2)
    return {
      expr: `${a}x + ${b}y + ${c}x + ${d}y`,
      correct: `${a + c}x + ${b + d}y`,
      alternatives: []
    }
  },
  // Level 9: 2(v + c) → 2v + 2c (gentle bridge to distribution, always factor 2)
  () => {
    const v = pickVar(), c = rand(1, 5)
    return { expr: `2(${v} + ${c})`, correct: `2${v} + ${2 * c}`, alternatives: [] }
  },
  // Level 10: coef(v + offset) → coef*v + coef*offset  (distribution, larger coefficients)
  () => {
    const v = pickVar(), coef = rand(3, 5), offset = rand(2, 5)
    return { expr: `${coef}(${v} + ${offset})`, correct: `${coef}${v} + ${coef * offset}`, alternatives: [] }
  },
  // Level 11: coef(v + offset) + extra*v → (coef+extra)v + coef*offset
  () => {
    const v = pickVar(), coef = rand(2, 3), offset = rand(2, 4), extra = rand(1, 3)
    return {
      expr: `${coef}(${v} + ${offset}) + ${extra}${v}`,
      correct: `${coef + extra}${v} + ${coef * offset}`,
      alternatives: []
    }
  },
  // Level 12: p(v + q) + r(v + s) → (p+r)v + (p*q+r*s)
  () => {
    const v = pickVar(), p = rand(2, 3), q = rand(1, 3), r = rand(1, 2), s = rand(1, 3)
    return {
      expr: `${p}(${v} + ${q}) + ${r}(${v} + ${s})`,
      correct: `${p + r}${v} + ${p * q + r * s}`,
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
      difficulty: { conceptual_level: idx + 1 },
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
    difficulty: { conceptual_level: idx + 1 },
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
