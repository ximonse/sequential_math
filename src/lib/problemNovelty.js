import { inferOperationFromProblemType } from './mathUtils'

const EXACT_REPEAT_PENALTY = 80
const STRUCTURE_REPEAT_PENALTY = 24
const NUMBER_REPEAT_PENALTY = 4

function normalizeText(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/−/g, '-')
    .replace(/×|·|\*/g, 'x')
    .trim()
}

function getOperation(problem) {
  const directSkill = String(problem?.skill || '').trim()
  if (directSkill) return directSkill

  const directType = String(problem?.type || '').trim()
  if (directType) return directType

  const storedType = String(problem?.problemType || '').trim()
  if (!storedType) return ''
  return inferOperationFromProblemType(storedType, {
    fallback: storedType,
    allowUnknownPrefix: true
  })
}

function getLevel(problem) {
  const explicit = Number(problem?.level)
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit)
  const conceptual = Number(problem?.difficulty?.conceptual_level)
  if (Number.isFinite(conceptual) && conceptual > 0) return Math.round(conceptual)
  return null
}

function collectAssignmentText(problem) {
  const values = problem?.values
  if (!values || typeof values !== 'object') return ''
  const variables = values.variables
  if (!variables || typeof variables !== 'object') return ''
  const parts = Object.entries(variables)
    .map(([name, value]) => `${String(name).trim()}=${Number(value)}`)
    .sort((a, b) => a.localeCompare(b, 'sv'))
  return parts.join(',')
}

function getPromptText(problem) {
  const displayText = String(problem?.display?.text || '').trim()
  if (displayText) return displayText

  const metadataPrompt = String(problem?.metadata?.promptText || problem?.promptText || '').trim()
  if (metadataPrompt) return metadataPrompt

  const expression = String(problem?.values?.expression || '').trim()
  if (expression) {
    const assignment = collectAssignmentText(problem)
    return assignment ? `${expression}|${assignment}` : expression
  }

  const inlineText = String(problem?.values?.text || '').trim()
  if (inlineText) return inlineText

  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  const op = getOperation(problem)
  if (Number.isFinite(a) && Number.isFinite(b) && op) {
    return `${a}|${op}|${b}`
  }

  return ''
}

function getArithmeticExactKey(operation, level, a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return ''
  if (operation === 'addition' || operation === 'multiplication') {
    const low = Math.min(a, b)
    const high = Math.max(a, b)
    return `${operation}|l${level}|${low}|${high}`
  }
  return `${operation}|l${level}|${a}|${b}`
}

function getArithmeticStructureKey(operation, level, a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return ''
  const aDigits = String(Math.abs(Math.trunc(a))).length
  const bDigits = String(Math.abs(Math.trunc(b))).length
  if (operation === 'addition' || operation === 'multiplication') {
    const lowDigits = Math.min(aDigits, bDigits)
    const highDigits = Math.max(aDigits, bDigits)
    return `${operation}|l${level}|d${lowDigits}-${highDigits}`
  }
  return `${operation}|l${level}|d${aDigits}-${bDigits}`
}

function tokenizeNumbers(problem, promptText) {
  const values = problem?.values || {}
  const numberTokens = []

  if (Number.isFinite(Number(values.a))) numberTokens.push(Number(values.a))
  if (Number.isFinite(Number(values.b))) numberTokens.push(Number(values.b))
  if (Number.isFinite(Number(problem?.result))) numberTokens.push(Number(problem.result))
  if (Number.isFinite(Number(problem?.correctAnswer))) numberTokens.push(Number(problem.correctAnswer))

  const variableValues = values?.variables
  if (variableValues && typeof variableValues === 'object') {
    for (const value of Object.values(variableValues)) {
      const n = Number(value)
      if (Number.isFinite(n)) numberTokens.push(n)
    }
  }

  const fromPrompt = String(promptText || '').match(/-?\d+(?:[.,]\d+)?/g) || []
  for (const token of fromPrompt) {
    const n = Number(token.replace(',', '.'))
    if (Number.isFinite(n)) numberTokens.push(n)
  }

  return Array.from(new Set(numberTokens))
}

function normalizePromptShape(prompt) {
  return normalizeText(prompt).replace(/-?\d+(?:[.,]\d+)?/g, '#')
}

export function buildProblemNoveltyDescriptor(problem) {
  const operation = getOperation(problem)
  const level = getLevel(problem)
  const promptText = getPromptText(problem)
  const normalizedPrompt = normalizeText(promptText)

  const a = Number(problem?.values?.a)
  const b = Number(problem?.values?.b)
  const arithmeticExact = getArithmeticExactKey(operation, level, a, b)
  const arithmeticStructure = getArithmeticStructureKey(operation, level, a, b)

  const exactKey = arithmeticExact || `${operation}|l${level}|${normalizedPrompt}`
  const structureKey = arithmeticStructure || `${operation}|l${level}|${normalizePromptShape(promptText)}`
  const numberTokens = tokenizeNumbers(problem, promptText)

  return {
    operation,
    level,
    exactKey,
    structureKey,
    numberTokens
  }
}

function countSharedNumbers(numbersA, numbersB) {
  if (!Array.isArray(numbersA) || !Array.isArray(numbersB)) return 0
  if (numbersA.length === 0 || numbersB.length === 0) return 0
  const pool = new Set(numbersA)
  let shared = 0
  for (const number of numbersB) {
    if (pool.has(number)) shared += 1
  }
  return shared
}

export function scoreCandidateNovelty(candidate, recentProblems, options = {}) {
  const historyWindow = Math.max(1, Number(options.historyWindow) || 8)
  const candidateDescriptor = buildProblemNoveltyDescriptor(candidate)
  const source = Array.isArray(recentProblems) ? recentProblems : []
  const history = source.slice(-historyWindow).reverse()

  let score = 0
  for (let index = 0; index < history.length; index += 1) {
    const previous = buildProblemNoveltyDescriptor(history[index])
    if (!candidateDescriptor.operation || candidateDescriptor.operation !== previous.operation) continue

    const recencyWeight = 1 / (index + 1)
    if (candidateDescriptor.exactKey && candidateDescriptor.exactKey === previous.exactKey) {
      score += EXACT_REPEAT_PENALTY * recencyWeight
    } else if (candidateDescriptor.structureKey && candidateDescriptor.structureKey === previous.structureKey) {
      score += STRUCTURE_REPEAT_PENALTY * recencyWeight
    }

    const sharedNumbers = countSharedNumbers(candidateDescriptor.numberTokens, previous.numberTokens)
    if (sharedNumbers > 0) {
      score += Math.min(12, sharedNumbers * NUMBER_REPEAT_PENALTY) * recencyWeight
    }
  }

  return score
}
