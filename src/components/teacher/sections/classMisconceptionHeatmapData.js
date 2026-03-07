import { inferOperationFromProblemType } from '../../../lib/mathUtils'
import { getTableProblemSourceForStudent } from './dashboardTableStatusUtils'

export const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1)
export const OPERATIONS = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'algebra_evaluate',
  'algebra_simplify',
  'arithmetic_expressions',
  'fractions',
  'percentage'
]
const MAX_WRONG_ANSWERS_PER_LEVEL = 10

const FEATURE_LABELS = {
  decimal: 'Decimaltal',
  carry: 'Tiotalsovergang',
  borrow: 'Vaxling i subtraktion',
  large_numbers: 'Storre tal',
  negative_numbers: 'Negativa tal',
  parentheses: 'Parenteser',
  mixed_operations: 'Blandade raknesatt',
  fractions_notation: 'Braknotation',
  different_denominators: 'Olika namnare',
  percentage_context: 'Procentsammanhang',
  algebra_variable: 'Variabler',
  algebra_coefficient: 'Koefficienter',
  algebra_square: 'Kvadrering (x^2)'
}

const OPERATION_SYMBOLS = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷'
}

function createLevelBucket() {
  return {
    attempts: 0,
    correct: 0,
    knowledgeWrong: 0,
    misconceptionCount: 0,
    patternCounts: {},
    wrongAnswers: [],
    featureTotals: {},
    featureWrong: {}
  }
}

function increaseCount(target, key, amount = 1) {
  if (!key) return
  target[key] = Number(target[key] || 0) + amount
}

function keepLatestWrongAnswers(list) {
  return [...(Array.isArray(list) ? list : [])]
    .sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))
    .slice(0, MAX_WRONG_ANSWERS_PER_LEVEL)
}

function toNumberList(problem, promptText) {
  const out = []
  const rawA = Number(problem?.values?.a)
  const rawB = Number(problem?.values?.b)
  if (Number.isFinite(rawA)) out.push(rawA)
  if (Number.isFinite(rawB)) out.push(rawB)
  if (out.length > 0) return out

  const matches = String(promptText || '').match(/-?\d+(?:[.,]\d+)?/g) || []
  for (const raw of matches) {
    const numeric = Number(String(raw).replace(',', '.'))
    if (Number.isFinite(numeric)) out.push(numeric)
  }
  return out
}

function parseFeatureTags(problem, operation) {
  const promptText = String(problem?.promptText || problem?.values?.text || '').trim()
  const values = toNumberList(problem, promptText)
  const tags = []
  const hasDecimal = values.some(value => !Number.isInteger(value)) || /\d[,.]\d/.test(promptText)
  if (hasDecimal) tags.push('decimal')
  if (Number(problem?.carryCount || 0) > 0) tags.push('carry')
  if (Number(problem?.borrowCount || 0) > 0) tags.push('borrow')
  if (values.some(value => Math.abs(value) >= 100)) tags.push('large_numbers')
  if (values.some(value => value < 0)) tags.push('negative_numbers')

  if (operation === 'arithmetic_expressions') {
    if (/[()]/.test(promptText)) tags.push('parentheses')
    const hasMultipleOperators = ['+', '-', '−', '×', '*', '÷', '/']
      .filter(symbol => promptText.includes(symbol)).length >= 2
    if (hasMultipleOperators) tags.push('mixed_operations')
  }

  if (operation === 'fractions') {
    tags.push('fractions_notation')
    const denominatorMatches = promptText.match(/\/\s*\d+/g) || []
    if (denominatorMatches.length >= 2) tags.push('different_denominators')
  }

  if (operation === 'percentage') {
    tags.push('percentage_context')
  }

  if (operation === 'algebra_evaluate' || operation === 'algebra_simplify') {
    if (/[a-z]/i.test(promptText)) tags.push('algebra_variable')
    if (/\d+[a-z]/i.test(promptText)) tags.push('algebra_coefficient')
    if (/²|\^2/.test(promptText)) tags.push('algebra_square')
  }

  return [...new Set(tags)]
}

function buildFeatureSignalRows(featureTotals, featureWrong) {
  return Object.keys(featureTotals || {})
    .map(tag => {
      const attempts = Number(featureTotals[tag] || 0)
      const knowledgeWrong = Number(featureWrong?.[tag] || 0)
      return {
        tag,
        label: FEATURE_LABELS[tag] || tag,
        attempts,
        knowledgeWrong,
        errorRate: attempts > 0 ? (knowledgeWrong / attempts) : 0
      }
    })
    .filter(item => item.attempts > 0)
    .sort((a, b) => {
      if (a.knowledgeWrong !== b.knowledgeWrong) return b.knowledgeWrong - a.knowledgeWrong
      if (a.errorRate !== b.errorRate) return b.errorRate - a.errorRate
      return b.attempts - a.attempts
    })
}

function getKnowledgeCell(problem, operation) {
  const errCat = String(problem.errorCategory || '')
  const isKnowledgeLike = !problem.correct && (errCat === 'knowledge' || errCat === 'misconception')
  const patterns = Array.isArray(problem.patterns) ? problem.patterns.slice(0, 4) : []
  if (!isKnowledgeLike) return { isKnowledgeLike, errCat, patterns }

  const a = problem.values?.a
  const b = problem.values?.b
  const question = (a != null && b != null)
    ? `${a} ${OPERATION_SYMBOLS[operation] || '?'} ${b}`
    : (String(problem.promptText || problem.values?.text || '').trim() || null)

  return {
    isKnowledgeLike,
    errCat,
    patterns,
    wrongAnswer: {
      studentAnswer: problem.studentAnswer,
      correctAnswer: problem.correctAnswer,
      errorCategory: errCat,
      errorDetail: String(problem.errorDetail || ''),
      patterns,
      question,
      timestamp: Number(problem.timestamp || 0)
    }
  }
}

function buildRowCells(entry) {
  const seenLowerFeatures = new Set()
  const cells = []

  for (const level of LEVELS) {
    const bucket = entry.levelData[level]
    if (!bucket || bucket.attempts === 0) {
      cells.push({
        level,
        attempts: 0,
        successRate: null,
        knowledgeWrong: 0,
        misconceptionCount: 0,
        topPatterns: [],
        wrongAnswers: [],
        newLevelSignals: [],
        challengeSignals: []
      })
      continue
    }

    const topPatterns = Object.entries(bucket.patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([pattern]) => pattern)
    const challengeSignals = buildFeatureSignalRows(bucket.featureTotals, bucket.featureWrong)
    const currentFeatures = challengeSignals.map(item => item.tag)
    const newLevelSignals = challengeSignals.filter(item => !seenLowerFeatures.has(item.tag))

    for (const tag of currentFeatures) {
      seenLowerFeatures.add(tag)
    }

    cells.push({
      level,
      attempts: bucket.attempts,
      correct: bucket.correct,
      successRate: bucket.correct / bucket.attempts,
      knowledgeWrong: bucket.knowledgeWrong,
      misconceptionCount: bucket.misconceptionCount,
      topPatterns,
      wrongAnswers: bucket.wrongAnswers,
      newLevelSignals,
      challengeSignals
    })
  }

  return cells
}

export function buildHeatmapData(students) {
  const byOperation = Object.fromEntries(OPERATIONS.map(op => [op, new Map()]))

  for (const student of students) {
    const problems = getTableProblemSourceForStudent(student)
    for (const problem of problems) {
      const op = inferOperationFromProblemType(problem.problemType || '', {
        fallback: null,
        allowUnknownPrefix: false
      })
      if (!op || !byOperation[op]) continue

      const level = Math.round(Number(problem?.difficulty?.conceptual_level || problem?.targetLevel || 0))
      if (!Number.isInteger(level) || level < 1 || level > 12) continue

      if (!byOperation[op].has(student.studentId)) {
        byOperation[op].set(student.studentId, {
          studentId: student.studentId,
          name: student.name,
          levelData: {}
        })
      }
      const entry = byOperation[op].get(student.studentId)
      if (!entry.levelData[level]) {
        entry.levelData[level] = createLevelBucket()
      }

      const bucket = entry.levelData[level]
      bucket.attempts += 1
      if (problem.correct) bucket.correct += 1

      const featureTags = parseFeatureTags(problem, op)
      for (const tag of featureTags) {
        increaseCount(bucket.featureTotals, tag)
      }

      const knowledgeCell = getKnowledgeCell(problem, op)
      if (!knowledgeCell.isKnowledgeLike) continue

      bucket.knowledgeWrong += 1
      if (knowledgeCell.errCat === 'misconception') {
        bucket.misconceptionCount += 1
      }
      if (knowledgeCell.wrongAnswer) {
        bucket.wrongAnswers = keepLatestWrongAnswers([
          ...bucket.wrongAnswers,
          knowledgeCell.wrongAnswer
        ])
      }
      for (const pattern of knowledgeCell.patterns) {
        increaseCount(bucket.patternCounts, pattern)
      }
      for (const tag of featureTags) {
        increaseCount(bucket.featureWrong, tag)
      }
    }
  }

  return Object.fromEntries(OPERATIONS.map(op => {
    const rows = Array.from(byOperation[op].values())
      .map(entry => ({
        studentId: entry.studentId,
        name: entry.name,
        cells: buildRowCells(entry)
      }))
      .filter(row => row.cells.some(cell => cell.attempts > 0))
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'))

    return [op, rows]
  }))
}
