import { pickFromRotation } from '../../lib/rotationPicker'

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const SINGLE_VARS = ['x', 'y', 'a', 'b', 'm', 'n', 'p', 'q']
const DOUBLE_VARS = [
  ['x', 'y'],
  ['a', 'b'],
  ['m', 'n'],
  ['p', 'q']
]

function pickVar() {
  return pick(SINGLE_VARS)
}

function pickVarPair() {
  return pick(DOUBLE_VARS)
}

function formatVarDisplay(vars) {
  return Object.entries(vars)
    .map(([name, value]) => `${name} = ${value}`)
    .join(', ')
}

function makeEvaluate(expr, vars, result, templateId) {
  const varDisplay = formatVarDisplay(vars)
  return {
    expr,
    vars,
    result,
    varDisplay,
    templateId
  }
}

function chooseLevelVariant(levelKey, variants) {
  const indexes = variants.map((_, index) => index)
  const pickedIndex = pickFromRotation(levelKey, indexes)
  const safeIndex = Number.isInteger(pickedIndex) ? pickedIndex : 0
  return variants[safeIndex]
}

const EVALUATE_LEVEL_VARIANTS = [
  [
    () => {
      const v = pickVar()
      const x = rand(2, 12)
      const c = rand(2, 8)
      return makeEvaluate(`${v} + ${c}`, { [v]: x }, x + c, 'eval_l1_add_var_first')
    },
    () => {
      const v = pickVar()
      const x = rand(2, 12)
      const c = rand(2, 8)
      return makeEvaluate(`${c} + ${v}`, { [v]: x }, c + x, 'eval_l1_add_const_first')
    }
  ],
  [
    () => {
      const v = pickVar()
      const x = rand(2, 9)
      const c = rand(x + 2, x + 15)
      return makeEvaluate(`${c} − ${v}`, { [v]: x }, c - x, 'eval_l2_sub_const_minus_var')
    },
    () => {
      const v = pickVar()
      const x = rand(2, 8)
      const c = rand(x + 3, x + 14)
      return makeEvaluate(`${c + 1} − ${v}`, { [v]: x }, c + 1 - x, 'eval_l2_sub_wider_gap')
    }
  ],
  [
    () => {
      const v = pickVar()
      const x = rand(3, 12)
      return makeEvaluate(`${v} + ${v}`, { [v]: x }, 2 * x, 'eval_l3_double_sum')
    },
    () => {
      const v = pickVar()
      const x = rand(3, 12)
      return makeEvaluate(`2${v}`, { [v]: x }, 2 * x, 'eval_l3_double_coef')
    }
  ],
  [
    () => {
      const v = pickVar()
      const x = rand(3, 12)
      return makeEvaluate(`2${v}`, { [v]: x }, 2 * x, 'eval_l4_double_coef')
    },
    () => {
      const v = pickVar()
      const x = rand(3, 12)
      return makeEvaluate(`${v} + ${v}`, { [v]: x }, x + x, 'eval_l4_double_sum')
    }
  ],
  [
    () => {
      const v = pickVar()
      const x = rand(2, 12)
      return makeEvaluate(`3${v}`, { [v]: x }, 3 * x, 'eval_l5_triple_coef')
    },
    () => {
      const v = pickVar()
      const x = rand(2, 10)
      return makeEvaluate(`${v} + ${v} + ${v}`, { [v]: x }, 3 * x, 'eval_l5_triple_sum')
    },
    () => {
      const v = pickVar()
      const x = rand(2, 10)
      return makeEvaluate(`2${v} + ${v}`, { [v]: x }, 3 * x, 'eval_l5_two_plus_one')
    }
  ],
  [
    () => {
      const v = pickVar()
      const x = rand(2, 10)
      const c = rand(1, 9)
      return makeEvaluate(`2${v} + ${c}`, { [v]: x }, 2 * x + c, 'eval_l6_two_x_plus_c')
    },
    () => {
      const v = pickVar()
      const x = rand(2, 10)
      const c = rand(1, 9)
      return makeEvaluate(`${c} + 2${v}`, { [v]: x }, c + 2 * x, 'eval_l6_c_plus_two_x')
    },
    () => {
      const v = pickVar()
      const x = rand(2, 10)
      const c = rand(1, 7)
      return makeEvaluate(`${v} + ${v} + ${c}`, { [v]: x }, 2 * x + c, 'eval_l6_sum_plus_c')
    }
  ],
  [
    () => {
      const v = pickVar()
      const x = rand(3, 11)
      const c = rand(1, 8)
      return makeEvaluate(`3${v} − ${c}`, { [v]: x }, 3 * x - c, 'eval_l7_three_x_minus_c')
    },
    () => {
      const v = pickVar()
      const x = rand(3, 11)
      const c = rand(1, 8)
      return makeEvaluate(`2${v} + ${v} − ${c}`, { [v]: x }, 3 * x - c, 'eval_l7_two_plus_one_minus_c')
    }
  ],
  [
    () => {
      const v = pickVar()
      const x = rand(3, 12)
      const a = rand(4, 8)
      const c = rand(2, 12)
      return makeEvaluate(`${a}${v} + ${c}`, { [v]: x }, a * x + c, 'eval_l8_ax_plus_c')
    },
    () => {
      const v = pickVar()
      const x = rand(3, 12)
      const a = rand(4, 8)
      const c = rand(2, 12)
      return makeEvaluate(`${c} + ${a}${v}`, { [v]: x }, c + a * x, 'eval_l8_c_plus_ax')
    },
    () => {
      const v = pickVar()
      const x = rand(3, 11)
      const a = rand(4, 7)
      const c1 = rand(1, 5)
      const c2 = rand(1, 5)
      return makeEvaluate(`${a}${v} + ${c1} + ${c2}`, { [v]: x }, a * x + c1 + c2, 'eval_l8_ax_plus_two_constants')
    }
  ],
  [
    () => {
      const v = pickVar()
      const x = rand(4, 12)
      const a = rand(3, 8)
      const c = rand(1, 9)
      return makeEvaluate(`${a}${v} − ${c}`, { [v]: x }, a * x - c, 'eval_l9_ax_minus_c')
    },
    () => {
      const v = pickVar()
      const x = rand(4, 12)
      const a = rand(3, 8)
      const c1 = rand(2, 8)
      const c2 = rand(c1 + 1, c1 + 8)
      return makeEvaluate(`${a}${v} + ${c1} − ${c2}`, { [v]: x }, a * x + c1 - c2, 'eval_l9_ax_plus_then_minus')
    }
  ],
  [
    () => {
      const [v1, v2] = pickVarPair()
      const x = rand(2, 9)
      const y = rand(2, 9)
      const a = rand(2, 6)
      const b = rand(2, 5)
      return makeEvaluate(
        `${a}${v1} + ${b}${v2}`,
        { [v1]: x, [v2]: y },
        a * x + b * y,
        'eval_l10_ax_plus_by'
      )
    },
    () => {
      const [v1, v2] = pickVarPair()
      const x = rand(2, 9)
      const y = rand(2, 9)
      const a = rand(2, 6)
      const b = rand(2, 5)
      return makeEvaluate(
        `${b}${v2} + ${a}${v1}`,
        { [v1]: x, [v2]: y },
        b * y + a * x,
        'eval_l10_by_plus_ax'
      )
    }
  ],
  [
    () => {
      const [v1, v2] = pickVarPair()
      const x = rand(3, 10)
      const y = rand(2, 8)
      const a = rand(3, 7)
      const b = rand(2, 5)
      return makeEvaluate(
        `${a}${v1} − ${b}${v2}`,
        { [v1]: x, [v2]: y },
        a * x - b * y,
        'eval_l11_ax_minus_by'
      )
    },
    () => {
      const [v1, v2] = pickVarPair()
      const x = rand(3, 10)
      const y = rand(2, 8)
      const a = rand(3, 7)
      const b = rand(2, 5)
      const c = rand(1, 7)
      return makeEvaluate(
        `${a}${v1} + ${c} − ${b}${v2}`,
        { [v1]: x, [v2]: y },
        a * x + c - b * y,
        'eval_l11_ax_plus_c_minus_by'
      )
    }
  ],
  [
    () => {
      const [v1, v2] = pickVarPair()
      const x = rand(2, 9)
      const y = rand(2, 9)
      const a = rand(2, 6)
      const b = rand(2, 5)
      const c = rand(1, 10)
      return makeEvaluate(
        `${a}${v1} + ${b}${v2} + ${c}`,
        { [v1]: x, [v2]: y },
        a * x + b * y + c,
        'eval_l12_ax_by_plus_c'
      )
    },
    () => {
      const [v1, v2] = pickVarPair()
      const x = rand(2, 9)
      const y = rand(2, 9)
      const a = rand(2, 6)
      const b = rand(2, 5)
      const c = rand(1, 10)
      return makeEvaluate(
        `${c} + ${a}${v1} + ${b}${v2}`,
        { [v1]: x, [v2]: y },
        c + a * x + b * y,
        'eval_l12_c_plus_ax_by'
      )
    },
    () => {
      const [v1, v2] = pickVarPair()
      const x = rand(2, 8)
      const y = rand(2, 8)
      const a = rand(2, 5)
      const b = rand(2, 4)
      const c1 = rand(1, 5)
      const c2 = rand(1, 5)
      return makeEvaluate(
        `${a}${v1} + ${c1} + ${b}${v2} + ${c2}`,
        { [v1]: x, [v2]: y },
        a * x + c1 + b * y + c2,
        'eval_l12_ax_plus_constants_plus_by'
      )
    }
  ]
]

function makeSimplify(expr, correct, templateId, alternatives = []) {
  return { expr, correct, alternatives, templateId }
}

const SIMPLIFY_LEVEL_VARIANTS = [
  [
    () => {
      const v = pickVar()
      return makeSimplify(`${v} + ${v}`, `2${v}`, 'simp_l1_double')
    }
  ],
  [
    () => {
      const v = pickVar()
      return makeSimplify(`${v} + ${v} + ${v}`, `3${v}`, 'simp_l2_three_sum')
    },
    () => {
      const v = pickVar()
      return makeSimplify(`2${v} + ${v}`, `3${v}`, 'simp_l2_two_plus_one')
    },
    () => {
      const v = pickVar()
      return makeSimplify(`${v} + 2${v}`, `3${v}`, 'simp_l2_one_plus_two')
    }
  ],
  [
    () => {
      const v = pickVar()
      const c = rand(2, 8)
      const d = rand(2, 7)
      return makeSimplify(`${c}${v} + ${d}${v}`, `${c + d}${v}`, 'simp_l3_add_like_terms')
    },
    () => {
      const v = pickVar()
      const c = rand(4, 9)
      const d = rand(1, c - 1)
      return makeSimplify(`${c}${v} − ${d}${v}`, `${c - d}${v}`, 'simp_l3_sub_like_terms')
    }
  ],
  [
    () => {
      const v = pickVar()
      const k = rand(2, 12)
      return makeSimplify(`${v} + ${k} + ${v}`, `2${v} + ${k}`, 'simp_l4_var_const_var')
    },
    () => {
      const v = pickVar()
      const k = rand(2, 12)
      return makeSimplify(`${k} + ${v} + ${v}`, `2${v} + ${k}`, 'simp_l4_const_var_var')
    }
  ],
  [
    () => {
      const v = pickVar()
      const c = rand(2, 6)
      const d = rand(1, 5)
      const k = rand(1, 11)
      return makeSimplify(`${c}${v} + ${k} + ${d}${v}`, `${c + d}${v} + ${k}`, 'simp_l5_two_like_plus_const')
    },
    () => {
      const v = pickVar()
      const c = rand(2, 6)
      const d = rand(1, 5)
      const k = rand(1, 11)
      return makeSimplify(`${k} + ${c}${v} + ${d}${v}`, `${c + d}${v} + ${k}`, 'simp_l5_const_then_like_terms')
    }
  ],
  [
    () => {
      const v = pickVar()
      const c = rand(2, 6)
      const d = rand(1, 5)
      const k = rand(2, 10)
      const m = rand(1, 9)
      return makeSimplify(
        `${c}${v} + ${k} + ${d}${v} + ${m}`,
        `${c + d}${v} + ${k + m}`,
        'simp_l6_two_constants'
      )
    },
    () => {
      const v = pickVar()
      const c = rand(2, 6)
      const d = rand(1, 5)
      const k = rand(2, 10)
      const m = rand(1, 9)
      return makeSimplify(
        `${k} + ${c}${v} + ${m} + ${d}${v}`,
        `${c + d}${v} + ${k + m}`,
        'simp_l6_shuffled_terms'
      )
    }
  ],
  [
    () => {
      const [v1, v2] = pickVarPair()
      const a = rand(2, 6)
      const b = rand(2, 5)
      const c = rand(1, 5)
      return makeSimplify(
        `${a}${v1} + ${b}${v2} + ${c}${v1}`,
        `${a + c}${v1} + ${b}${v2}`,
        'simp_l7_two_vars_merge_one'
      )
    },
    () => {
      const [v1, v2] = pickVarPair()
      const a = rand(2, 6)
      const b = rand(2, 5)
      const c = rand(1, 5)
      return makeSimplify(
        `${b}${v2} + ${a}${v1} + ${c}${v1}`,
        `${a + c}${v1} + ${b}${v2}`,
        'simp_l7_shuffled_two_vars'
      )
    }
  ],
  [
    () => {
      const [v1, v2] = pickVarPair()
      const a = rand(2, 5)
      const b = rand(2, 5)
      const c = rand(1, 4)
      const d = rand(1, 4)
      return makeSimplify(
        `${a}${v1} + ${b}${v2} + ${c}${v1} + ${d}${v2}`,
        `${a + c}${v1} + ${b + d}${v2}`,
        'simp_l8_merge_both_vars'
      )
    },
    () => {
      const [v1, v2] = pickVarPair()
      const a = rand(2, 5)
      const b = rand(2, 5)
      const c = rand(1, 4)
      const d = rand(1, 4)
      return makeSimplify(
        `${b}${v2} + ${a}${v1} + ${d}${v2} + ${c}${v1}`,
        `${a + c}${v1} + ${b + d}${v2}`,
        'simp_l8_shuffled_merge_both'
      )
    }
  ],
  [
    () => {
      const v = pickVar()
      const c = rand(1, 8)
      return makeSimplify(`2(${v} + ${c})`, `2${v} + ${2 * c}`, 'simp_l9_distribute_two')
    },
    () => {
      const v = pickVar()
      const c = rand(1, 8)
      return makeSimplify(`2(${c} + ${v})`, `2${v} + ${2 * c}`, 'simp_l9_distribute_two_reordered')
    }
  ],
  [
    () => {
      const v = pickVar()
      const coef = rand(3, 7)
      const offset = rand(2, 8)
      return makeSimplify(
        `${coef}(${v} + ${offset})`,
        `${coef}${v} + ${coef * offset}`,
        'simp_l10_distribute'
      )
    },
    () => {
      const v = pickVar()
      const coef = rand(3, 7)
      const offset = rand(2, 8)
      return makeSimplify(
        `${coef}(${offset} + ${v})`,
        `${coef}${v} + ${coef * offset}`,
        'simp_l10_distribute_reordered'
      )
    }
  ],
  [
    () => {
      const v = pickVar()
      const coef = rand(2, 5)
      const offset = rand(2, 6)
      const extra = rand(1, 5)
      return makeSimplify(
        `${coef}(${v} + ${offset}) + ${extra}${v}`,
        `${coef + extra}${v} + ${coef * offset}`,
        'simp_l11_distribute_plus_like_term'
      )
    },
    () => {
      const v = pickVar()
      const coef = rand(2, 5)
      const offset = rand(2, 6)
      const extra = rand(1, 5)
      return makeSimplify(
        `${extra}${v} + ${coef}(${v} + ${offset})`,
        `${coef + extra}${v} + ${coef * offset}`,
        'simp_l11_shuffled_distribution'
      )
    }
  ],
  [
    () => {
      const v = pickVar()
      const p = rand(2, 5)
      const q = rand(1, 5)
      const r = rand(1, 4)
      const s = rand(1, 5)
      return makeSimplify(
        `${p}(${v} + ${q}) + ${r}(${v} + ${s})`,
        `${p + r}${v} + ${p * q + r * s}`,
        'simp_l12_two_distributions'
      )
    },
    () => {
      const v = pickVar()
      const p = rand(2, 5)
      const q = rand(1, 5)
      const r = rand(1, 4)
      const s = rand(1, 5)
      return makeSimplify(
        `${r}(${v} + ${s}) + ${p}(${v} + ${q})`,
        `${p + r}${v} + ${p * q + r * s}`,
        'simp_l12_swapped_distributions'
      )
    }
  ]
]

function buildAlgebraMetadata(promptText, templateId, level, skill) {
  return {
    promptText,
    varietyTemplate: templateId,
    skillTag: `${skill}_l${level}_${templateId}`
  }
}

export function generateAlgebraProblem(skill, level) {
  const idx = Math.max(0, Math.min(11, Math.round(Number(level || 1)) - 1))
  const resolvedLevel = idx + 1

  if (skill === 'algebra_simplify') {
    const maker = chooseLevelVariant(
      `algebra:simplify:l${resolvedLevel}`,
      SIMPLIFY_LEVEL_VARIANTS[idx]
    )
    const tpl = maker()
    const promptText = `Förenkla: ${tpl.expr}`

    return {
      domain: 'algebra',
      skill: 'algebra_simplify',
      type: 'algebra_simplify',
      level: resolvedLevel,
      difficulty: { conceptual_level: resolvedLevel },
      display: { type: 'expression', text: promptText },
      values: { expression: tpl.expr },
      answer: { type: 'expression', correct: tpl.correct, alternatives: tpl.alternatives },
      result: null,
      metadata: buildAlgebraMetadata(promptText, tpl.templateId, resolvedLevel, 'algebra_simplify'),
      generated_at: Date.now()
    }
  }

  const maker = chooseLevelVariant(
    `algebra:evaluate:l${resolvedLevel}`,
    EVALUATE_LEVEL_VARIANTS[idx]
  )
  const tpl = maker()
  const promptText = `Beräkna värdet av ${tpl.expr} när ${tpl.varDisplay}`

  return {
    domain: 'algebra',
    skill: 'algebra_evaluate',
    type: 'algebra_evaluate',
    level: resolvedLevel,
    difficulty: { conceptual_level: resolvedLevel },
    display: {
      type: 'expression',
      text: promptText
    },
    values: { expression: tpl.expr, variables: tpl.vars, varDisplay: tpl.varDisplay },
    answer: { type: 'number', correct: tpl.result },
    result: tpl.result,
    metadata: buildAlgebraMetadata(promptText, tpl.templateId, resolvedLevel, 'algebra_evaluate'),
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
