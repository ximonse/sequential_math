import { pickFromRotation } from '../../lib/rotationPicker'

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function rotatePick(key, arr) {
  const indexes = arr.map((_, index) => index)
  const pickedIndex = pickFromRotation(key, indexes)
  const safeIndex = Number.isInteger(pickedIndex) ? pickedIndex : 0
  return arr[safeIndex]
}

function percentagePrompt(level, operation, value) {
  const variants = {
    percent_of: [
      `Vad är ${operation}% av ${value}?`,
      `Beräkna ${operation}% av ${value}.`,
      `Hur mycket är ${operation}% av ${value}?`
    ],
    discount: [
      `En vara kostar ${value} kr. Det är ${operation}% rabatt. Vad kostar varan nu?`,
      `Priset är ${value} kr och sänks med ${operation}%. Vad blir nya priset?`,
      `Du får ${operation}% rabatt på ${value} kr. Vad betalar du?`
    ],
    increase: [
      `Ett pris är ${value} kr och höjs med ${operation}%. Vad är det nya priset?`,
      `En vara kostar ${value} kr och priset ökar med ${operation}%. Vad kostar den efter ökningen?`,
      `Utgångspriset är ${value} kr. Efter en höjning på ${operation}%, vilket pris får du?`
    ],
    share: [
      `Hur många procent är ${operation} av ${value}?`,
      `${operation} är hur stor andel i procent av ${value}?`,
      `Beräkna procentandelen: ${operation} av ${value}.`
    ]
  }

  const list = variants[level] || variants.percent_of
  return rotatePick(`percentage:phrasing:${level}`, list)
}

function makeTemplate(text, answer, templateId) {
  return { text, answer, templateId }
}

const TEMPLATES = [
  // Level 1: p% av 100
  () => {
    const p = Number(rotatePick('percentage:l1:p', [5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]))
    return makeTemplate(percentagePrompt('percent_of', p, 100), p, 'pct_l1_percent_of_100')
  },

  // Level 2: 50% av X
  () => {
    const x = 2 * rand(12, 120)
    return makeTemplate(percentagePrompt('percent_of', 50, x), x / 2, 'pct_l2_half')
  },

  // Level 3: 10% av X
  () => {
    const x = 10 * rand(8, 80)
    return makeTemplate(percentagePrompt('percent_of', 10, x), x / 10, 'pct_l3_tenth')
  },

  // Level 4: 25% av X
  () => {
    const x = 4 * rand(12, 90)
    return makeTemplate(percentagePrompt('percent_of', 25, x), x / 4, 'pct_l4_quarter')
  },

  // Level 5: 75% av X
  () => {
    const x = 4 * rand(12, 90)
    return makeTemplate(percentagePrompt('percent_of', 75, x), (3 * x) / 4, 'pct_l5_three_quarters')
  },

  // Level 6: 20% av X
  () => {
    const x = 5 * rand(10, 100)
    return makeTemplate(percentagePrompt('percent_of', 20, x), x / 5, 'pct_l6_one_fifth')
  },

  // Level 7: 5% av X
  () => {
    const x = 20 * rand(6, 40)
    return makeTemplate(percentagePrompt('percent_of', 5, x), x / 20, 'pct_l7_five_percent')
  },

  // Level 8: p% av X (enkla procentsatser)
  () => {
    const p = Number(rotatePick('percentage:l8:p', [10, 20, 25, 40, 50]))
    const x = (100 / p) * rand(3, 35)
    return makeTemplate(percentagePrompt('percent_of', p, x), (p * x) / 100, 'pct_l8_simple_mix')
  },

  // Level 9: p% av X (bredare mix)
  () => {
    const p = Number(rotatePick('percentage:l9:p', [5, 10, 12.5, 20, 25, 40, 50, 75]))
    const x = (100 / p) * rand(4, 45)
    return makeTemplate(percentagePrompt('percent_of', p, x), (p * x) / 100, 'pct_l9_wide_mix')
  },

  // Level 10: Rabatt
  () => {
    const p = Number(rotatePick('percentage:l10:p', [10, 15, 20, 25, 30, 40, 50]))
    const x = (100 / p) * rand(6, 45)
    const discount = (p * x) / 100
    return makeTemplate(percentagePrompt('discount', p, x), x - discount, 'pct_l10_discount')
  },

  // Level 11: Prisökning
  () => {
    const p = Number(rotatePick('percentage:l11:p', [5, 10, 12.5, 20, 25, 30, 40, 50]))
    const x = (100 / p) * rand(5, 30)
    const increase = (p * x) / 100
    return makeTemplate(percentagePrompt('increase', p, x), x + increase, 'pct_l11_increase')
  },

  // Level 12: Andel
  () => {
    const p = Number(rotatePick('percentage:l12:p', [10, 12.5, 20, 25, 40, 50, 60, 75, 80]))
    const y = (100 / p) * rand(2, 16)
    const x = (y * p) / 100
    return makeTemplate(percentagePrompt('share', x, y), p, 'pct_l12_share')
  }
]

export function generatePercentageProblem(skill, level) {
  const idx = Math.max(0, Math.min(11, Math.round(Number(level || 1)) - 1))
  const tpl = TEMPLATES[idx]()

  return {
    domain: 'percentage',
    skill: 'percentage',
    type: 'percentage',
    level: idx + 1,
    difficulty: { conceptual_level: idx + 1 },
    display: { type: 'expression', text: tpl.text },
    values: { text: tpl.text },
    answer: { type: 'number', correct: tpl.answer },
    result: tpl.answer,
    metadata: {
      promptText: tpl.text,
      varietyTemplate: tpl.templateId,
      skillTag: `percentage_l${idx + 1}_${tpl.templateId}`
    },
    generated_at: Date.now()
  }
}
