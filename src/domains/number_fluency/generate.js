import { getFluencyTargetSec } from '../../lib/operations.js'
import { pickFromRotation } from '../../lib/rotationPicker.js'

function clampLevel(level) {
  return Math.max(1, Math.min(12, Math.round(Number(level) || 1)))
}

function rotateNumber(key, values) {
  return Number(pickFromRotation(key, values))
}

function integers(min, max) {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

function makeProblem({ skill, level, text, answer, values, template }) {
  const fluencyTargetSec = getFluencyTargetSec(skill, level)
  return {
    domain: 'number_fluency',
    skill,
    type: skill,
    level,
    difficulty: { conceptual_level: level },
    display: { type: 'expression', text },
    values,
    answer: { type: 'number', correct: answer },
    result: answer,
    metadata: {
      promptText: text,
      varietyTemplate: template,
      skillTag: `${skill}_l${level}_${template}`,
      ...(fluencyTargetSec ? { fluencyTargetSec } : {})
    },
    generated_at: Date.now()
  }
}

function generateNumberBond(level) {
  const target = level <= 4 ? 10 : level <= 8 ? 15 : 20
  const term = rotateNumber(`number_bonds:l${level}:term`, integers(0, target))
  const missingFirst = rotateNumber(`number_bonds:l${level}:position`, [0, 1]) === 0
  const complement = target - term
  const text = missingFirst ? `? + ${term} = ${target}` : `${term} + ? = ${target}`
  return makeProblem({
    skill: 'number_bonds',
    level,
    text,
    answer: complement,
    values: { target, knownTerm: term, missingFirst },
    template: `bond_to_${target}_${missingFirst ? 'missing_first' : 'missing_second'}`
  })
}

const DOUBLE_RANGES = [
  null,
  [1, 5], [1, 10], [6, 15], [11, 20],
  [16, 25], [21, 30], [26, 38]
]

function generateDouble(level) {
  const transferRanges = {
    8: [6, 15],
    9: [11, 20],
    10: [16, 25],
    11: [26, 38],
    12: [26, 38]
  }
  const baseRange = DOUBLE_RANGES[level] || transferRanges[level] || [1, 38]
  const value = rotateNumber(`doubles:l${level}:value`, integers(...baseRange))
  let text = `${value} + ${value}`
  let answer = value * 2
  let template = 'double_addition'

  if (level === 8) {
    text = `2 × ${value}`
    template = 'double_two_times'
  } else if (level === 9) {
    text = `${value} × 2`
    template = 'double_times_two'
  } else if (level === 10) {
    const multiply = rotateNumber('doubles:l10:form', [0, 1]) === 1
    text = multiply ? `2 × ${value}` : `${value} + ${value}`
    template = multiply ? 'double_mixed_multiplication' : 'double_mixed_addition'
  } else if (level === 11) {
    answer = value
    text = `2 × ? = ${value * 2}`
    template = 'double_missing_factor'
  } else if (level === 12) {
    answer = value
    text = `${value * 2} ÷ 2`
    template = 'double_halving_transfer'
  }

  return makeProblem({
    skill: 'doubles',
    level,
    text,
    answer,
    values: { value, doubled: value * 2, form: template },
    template
  })
}

export function generateNumberFluencyProblem(skill, level) {
  const normalizedLevel = clampLevel(level)
  if (skill === 'number_bonds') return generateNumberBond(normalizedLevel)
  if (skill === 'doubles') return generateDouble(normalizedLevel)
  throw new Error(`Unknown number fluency skill: ${skill}`)
}
