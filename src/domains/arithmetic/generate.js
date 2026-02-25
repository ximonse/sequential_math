import {
  generateByDifficultyWithOptions,
  generateMultiplicationTableDrillProblem
} from '../../lib/problemGenerator'

function inferSkillFromLegacyType(type) {
  if (type === 'addition') return 'addition'
  if (type === 'subtraction') return 'subtraction'
  if (type === 'multiplication') return 'multiplication'
  if (type === 'division') return 'division'
  return 'addition'
}

function inferLegacyTypeFromSkill(skill) {
  if (skill === 'addition') return 'addition'
  if (skill === 'subtraction') return 'subtraction'
  if (skill === 'multiplication') return 'multiplication'
  if (skill === 'division') return 'division'
  return 'addition'
}

function buildDisplay(problem) {
  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  const type = String(problem?.type || '')
  const symbol = type === 'addition'
    ? '+'
    : type === 'subtraction'
      ? '−'
      : type === 'multiplication'
        ? '×'
        : type === 'division'
          ? '÷'
          : '?'

  return {
    type: 'expression',
    text: `${a} ${symbol} ${b}`
  }
}

function normalizeArithmeticProblem(problem, fallbackLevel = 1) {
  const next = {
    ...problem
  }
  const conceptualLevel = Math.max(
    1,
    Math.min(
      12,
      Math.round(Number(next?.difficulty?.conceptual_level || fallbackLevel || 1))
    )
  )

  next.domain = 'arithmetic'
  next.skill = inferSkillFromLegacyType(next.type)
  next.level = conceptualLevel
  next.display = next.display || buildDisplay(next)
  next.answer = next.answer || {
    type: 'number',
    correct: Number(next.result)
  }
  next.generated_at = Number(next.generated_at || Date.now())

  return next
}

export function generateArithmeticProblem(skill, level, options = {}) {
  const normalizedLevel = Math.max(1, Math.min(12, Math.round(Number(level || 1))))
  const tableSet = Array.isArray(options.tableSet)
    ? options.tableSet.filter(value => Number.isInteger(value))
    : []

  const problem = tableSet.length > 0
    ? generateMultiplicationTableDrillProblem(tableSet, { level: normalizedLevel })
    : generateByDifficultyWithOptions(normalizedLevel, {
      preferredType: inferLegacyTypeFromSkill(skill),
      allowedTypes: Array.isArray(options.allowedTypes) ? options.allowedTypes : undefined
    })

  return normalizeArithmeticProblem(problem, normalizedLevel)
}

export function normalizeArithmeticLegacyProblem(problem) {
  return normalizeArithmeticProblem(problem, Number(problem?.difficulty?.conceptual_level || 1))
}
