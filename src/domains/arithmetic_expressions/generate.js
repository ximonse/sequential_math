import { pickFromRotation } from '../../lib/rotationPicker'

function ri(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function divisorPair(maxA = 20, maxB = 9) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const b = ri(2, maxB)
    const quotient = ri(2, Math.floor(maxA / b))
    const a = b * quotient
    if (a <= maxA) return { a, b }
  }
  return { a: 12, b: 3 }
}

function chooseVariant(levelKey, variants) {
  const indexes = variants.map((_, index) => index)
  const pickedIndex = pickFromRotation(levelKey, indexes)
  const safeIndex = Number.isInteger(pickedIndex) ? pickedIndex : 0
  return variants[safeIndex]
}

function makeLevel1() {
  const variants = [
    () => {
      const a = ri(2, 6)
      const b = ri(2, 6)
      const c = ri(1, 12)
      return { text: `${a} × ${b} + ${c}`, answer: a * b + c, templateId: 'expr_l1_mul_plus' }
    },
    () => {
      const a = ri(2, 6)
      const b = ri(2, 6)
      const c = ri(1, 12)
      return { text: `${c} + ${a} × ${b}`, answer: c + a * b, templateId: 'expr_l1_plus_mul' }
    }
  ]
  return chooseVariant('expr:l1', variants)()
}

function makeLevel2() {
  const variants = [
    () => {
      const a = ri(2, 6)
      const b = ri(2, 6)
      const prod = a * b
      const c = ri(1, prod)
      return { text: `${a} × ${b} − ${c}`, answer: prod - c, templateId: 'expr_l2_mul_minus' }
    },
    () => {
      const b = ri(2, 5)
      const c = ri(2, 5)
      const prod = b * c
      const a = ri(prod, prod + 12)
      return { text: `${a} − ${b} × ${c}`, answer: a - prod, templateId: 'expr_l2_minus_mul' }
    }
  ]
  return chooseVariant('expr:l2', variants)()
}

function makeLevel3() {
  const variants = [
    () => {
      const { a, b } = divisorPair(28, 9)
      const c = ri(1, 12)
      return { text: `${a} ÷ ${b} + ${c}`, answer: a / b + c, templateId: 'expr_l3_div_plus' }
    },
    () => {
      const { a, b } = divisorPair(28, 9)
      const c = ri(1, 12)
      return { text: `${c} + ${a} ÷ ${b}`, answer: c + a / b, templateId: 'expr_l3_plus_div' }
    }
  ]
  return chooseVariant('expr:l3', variants)()
}

function makeLevel4() {
  const { a: b, b: c } = divisorPair(24, 9)
  const quotient = b / c
  const a = ri(quotient, quotient + 12)
  return { text: `${a} − ${b} ÷ ${c}`, answer: a - quotient, templateId: 'expr_l4_minus_div' }
}

function makeLevel5() {
  const variants = [
    () => {
      const a = ri(2, 6)
      const b = ri(2, 6)
      const c = ri(2, 6)
      const d = ri(2, 6)
      return { text: `${a} × ${b} + ${c} × ${d}`, answer: a * b + c * d, templateId: 'expr_l5_mul_plus_mul' }
    },
    () => {
      const a = ri(2, 6)
      const b = ri(2, 6)
      const c = ri(2, 6)
      const d = ri(2, 6)
      return { text: `${c} × ${d} + ${a} × ${b}`, answer: c * d + a * b, templateId: 'expr_l5_swapped_mul_plus_mul' }
    }
  ]
  return chooseVariant('expr:l5', variants)()
}

function makeLevel6() {
  const variants = [
    () => {
      const a = ri(1, 9)
      const b = ri(1, 9)
      const c = ri(2, 7)
      return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c, templateId: 'expr_l6_paren_plus_times' }
    },
    () => {
      const a = ri(1, 9)
      const b = ri(1, 9)
      const c = ri(2, 7)
      return { text: `${c} × (${a} + ${b})`, answer: c * (a + b), templateId: 'expr_l6_times_paren_plus' }
    }
  ]
  return chooseVariant('expr:l6', variants)()
}

function makeLevel7() {
  const variants = [
    () => {
      const b = ri(1, 8)
      const extra = ri(1, 6)
      const a = b + extra
      const c = ri(2, 7)
      return { text: `(${a} − ${b}) × ${c}`, answer: (a - b) * c, templateId: 'expr_l7_paren_minus_times' }
    },
    () => {
      const c = ri(2, 7)
      const sum = c * ri(2, 8)
      const a = ri(1, sum - 1)
      const b = sum - a
      return { text: `(${a} + ${b}) ÷ ${c}`, answer: sum / c, templateId: 'expr_l7_paren_plus_div' }
    }
  ]
  return chooseVariant('expr:l7', variants)()
}

function makeLevel8() {
  for (let i = 0; i < 20; i += 1) {
    const a = ri(2, 7)
    const b = ri(2, 7)
    const c = ri(2, 6)
    const d = ri(2, 6)
    const answer = a * b - c * d
    if (answer >= 0) {
      return {
        text: `${a} × ${b} − ${c} × ${d}`,
        answer,
        templateId: 'expr_l8_mul_minus_mul'
      }
    }
  }
  return { text: '5 × 4 − 3 × 2', answer: 14, templateId: 'expr_l8_fallback' }
}

function makeLevel9() {
  const variants = [
    () => {
      const a = ri(1, 8)
      const b = ri(1, 8)
      const c = ri(2, 6)
      const prod = (a + b) * c
      const d = ri(1, prod)
      return { text: `(${a} + ${b}) × ${c} − ${d}`, answer: prod - d, templateId: 'expr_l9_paren_times_minus' }
    },
    () => {
      const a = ri(1, 8)
      const b = ri(1, 8)
      const c = ri(2, 6)
      const prod = (a + b) * c
      const d = ri(1, prod)
      return { text: `${d} + (${a} + ${b}) × ${c} − ${d}`, answer: prod, templateId: 'expr_l9_compensated' }
    }
  ]
  return chooseVariant('expr:l9', variants)()
}

function makeLevel10() {
  const a = ri(1, 7)
  const b = ri(1, 7)
  const d = ri(1, 6)
  const extra = ri(1, 6)
  const c = d + extra
  return {
    text: `(${a} + ${b}) × (${c} − ${d})`,
    answer: (a + b) * (c - d),
    templateId: 'expr_l10_double_paren'
  }
}

function makeLevel11() {
  for (let i = 0; i < 20; i += 1) {
    const a = ri(2, 6)
    const b = ri(1, 7)
    const c = ri(1, 7)
    const d = ri(2, 5)
    const e = ri(2, 5)
    const answer = a * (b + c) - d * e
    if (answer >= 0) {
      return {
        text: `${a} × (${b} + ${c}) − ${d} × ${e}`,
        answer,
        templateId: 'expr_l11_distribute_minus_mul'
      }
    }
  }
  return { text: '3 × (2 + 4) − 2 × 5', answer: 8, templateId: 'expr_l11_fallback' }
}

function makeLevel12() {
  const { a: sum, b: c } = divisorPair(30, 7)
  const a = ri(1, sum - 1)
  const b = sum - a
  const d = ri(2, 6)
  const e = ri(2, 6)
  return {
    text: `(${a} + ${b}) ÷ ${c} + ${d} × ${e}`,
    answer: sum / c + d * e,
    templateId: 'expr_l12_mix_div_and_mul'
  }
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
  for (let i = 0; i < 10; i += 1) {
    try {
      result = maker()
      break
    } catch {
      // retry
    }
  }
  if (!result) result = makeLevel1()

  return {
    domain: 'arithmetic_expressions',
    skill: 'arithmetic_expressions',
    level: lvl,
    difficulty: { conceptual_level: lvl },
    display: { text: result.text },
    values: { text: result.text },
    answer: { type: 'number', value: result.answer },
    result: result.answer,
    metadata: {
      promptText: result.text,
      template: `level_${lvl}`,
      varietyTemplate: result.templateId,
      skillTag: `arithmetic_expressions_l${lvl}_${result.templateId}`
    }
  }
}
