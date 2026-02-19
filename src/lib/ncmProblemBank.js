import safeAsExpressions from '../../NMC/processed/safe_batch_as_expressions.json'
import safeAsExpressionExtra from '../../NMC/processed/safe_batch_as_expression_extra.json'
import safeAsWordProblems from '../../NMC/processed/safe_batch_as_word_problems.json'
import safeCrossDomainWordNumeric from '../../NMC/processed/safe_batch_cross_domain_word_numeric.json'
import { getNcmDomainLabelSv, getNcmOperationLabelSv, normalizeNcmCode } from './ncmSkillMap'

const KNOWN_OPERATIONS = new Set(['addition', 'subtraction', 'multiplication', 'division'])
const SAFE_BATCHES = [
  safeAsExpressions,
  safeAsExpressionExtra,
  safeAsWordProblems,
  safeCrossDomainWordNumeric
]

const ABILITY_LABELS_SV = Object.freeze({
  ncm_arithmetic: 'Aritmetik',
  ncm_written_method: 'Skriftlig metod',
  ncm_word_problem: 'Textuppgift',
  ncm_place_value: 'Positionssystem',
  ncm_number_sense: 'Taluppfattning',
  ncm_basic_number_operations: 'Räknesätt',
  ncm_rational_numbers: 'Rationella tal',
  ncm_geometry: 'Geometri',
  ncm_measurement: 'Mätning',
  ncm_statistics_probability: 'Statistik och sannolikhet',
  concept_decimal: 'Decimaltal',
  concept_fraction: 'Bråk',
  concept_percent: 'Procent',
  multi_digit: 'Flersiffriga tal',
  op_addition: 'Addition',
  op_subtraction: 'Subtraktion',
  op_multiplication: 'Multiplikation',
  op_division: 'Division'
})

const NCM_CODE_LABELS_SV = Object.freeze({
  AS1: 'AS1 - Skriftlig addition',
  AS2: 'AS2 - Skriftlig subtraktion',
  AS3: 'AS3 - Textproblem add/sub',
  AS4: 'AS4 - Multiplikation',
  AS5: 'AS5 - Division',
  AS6: 'AS6 - Textproblem mul/div',
  AS7: 'AS7 - Flersiffrig multiplikation',
  AS8: 'AS8 - Division fortsättning',
  AS9: 'AS9 - Decimal add/sub',
  AS10: 'AS10 - Decimal multiplikation',
  AS11: 'AS11 - Decimal division',
  RP5: 'RP5 - Procent',
  SA2: 'SA2 - Sannolikhet/statistik'
})

export const NCM_SAFE_PROBLEM_BANK = Object.freeze(
  SAFE_BATCHES
    .flatMap(batch => (Array.isArray(batch) ? batch : []))
    .map(toBankEntry)
    .filter(Boolean)
)

export function getNcmCodeOptions() {
  const byCode = new Map()
  for (const item of NCM_SAFE_PROBLEM_BANK) {
    const previous = byCode.get(item.ncmCode) || {
      code: item.ncmCode,
      label: getNcmCodeLabelSv(item.ncmCode),
      count: 0,
      domainTag: item.domainTag
    }
    previous.count += 1
    byCode.set(item.ncmCode, previous)
  }

  return Array.from(byCode.values()).sort((a, b) => {
    const codeCompare = String(a.code || '').localeCompare(String(b.code || ''), 'sv')
    if (codeCompare !== 0) return codeCompare
    return Number(b.count || 0) - Number(a.count || 0)
  })
}

export function getNcmAbilityOptions() {
  const byAbility = new Map()
  for (const item of NCM_SAFE_PROBLEM_BANK) {
    for (const ability of item.abilityTags) {
      const previous = byAbility.get(ability) || {
        tag: ability,
        label: getNcmAbilityLabelSv(ability),
        count: 0
      }
      previous.count += 1
      byAbility.set(ability, previous)
    }
  }

  return Array.from(byAbility.values()).sort((a, b) => {
    const countDiff = Number(b.count || 0) - Number(a.count || 0)
    if (countDiff !== 0) return countDiff
    return String(a.label || '').localeCompare(String(b.label || ''), 'sv')
  })
}

export function getNcmCodeLabelSv(code) {
  const normalized = normalizeNcmCode(code)
  if (!normalized) return 'NCM'
  const manual = NCM_CODE_LABELS_SV[normalized]
  if (manual) return manual
  return `NCM ${normalized}`
}

export function getNcmAbilityLabelSv(tag) {
  const normalized = String(tag || '').trim()
  if (!normalized) return 'NCM-förmåga'
  return ABILITY_LABELS_SV[normalized] || normalized
}

export function filterNcmProblems(filter = {}) {
  const codeSet = new Set(normalizeCodeList(filter.codes))
  const abilitySet = new Set(normalizeTagList(filter.abilityTags))
  const domainSet = new Set(normalizeTagList(filter.domainTags))
  const operationSet = new Set(normalizeTagList(filter.operationTags))

  return NCM_SAFE_PROBLEM_BANK.filter((item) => {
    if (codeSet.size > 0 && !codeSet.has(item.ncmCode)) return false
    if (domainSet.size > 0 && !domainSet.has(item.domainTag)) return false
    if (operationSet.size > 0 && !operationSet.has(item.operationTag)) return false
    if (abilitySet.size === 0) return true
    return item.abilityTags.some(tag => abilitySet.has(tag))
  })
}

export function hasNcmProblems(filter = {}) {
  return filterNcmProblems(filter).length > 0
}

export function generateNcmProblemFromFilter(filter = {}, options = {}) {
  const candidates = filterNcmProblems(filter)
  if (candidates.length === 0) return null

  const picked = candidates[Math.floor(Math.random() * candidates.length)]
  const levelHint = Number(options.levelHint || picked.level || 6)
  const conceptualLevel = clamp(Math.round(levelHint), 1, 12)
  const estimatedTime = Number.isFinite(Number(picked.estimatedTimeSec))
    ? Number(picked.estimatedTimeSec)
    : estimatePromptTimeSec(picked.questionText)

  return {
    id: `ncm_${picked.ncmCode}_${picked.itemNo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    template: picked.ncmCode,
    type: picked.type,
    values: picked.values,
    result: picked.expectedAnswer,
    difficulty: {
      conceptual_level: conceptualLevel,
      cognitive_load: {
        working_memory: picked.questionText.length > 70 ? 3 : 2,
        steps_required: picked.questionText.length > 70 ? 3 : 2,
        intermediate_values: 1
      },
      procedural: {
        num_terms: 2,
        mixed_digits: true
      },
      magnitude: picked.magnitude
    },
    metadata: {
      skillTag: picked.skillTag,
      estimated_time: estimatedTime,
      description: `NCM ${picked.ncmCode} uppgift ${picked.itemNo}`,
      promptText: picked.questionText,
      ncmCode: picked.ncmCode,
      ncmItemNo: picked.itemNo,
      ncmDomainTag: picked.domainTag,
      ncmOperationTag: picked.operationTag,
      ncmAbilityTags: picked.abilityTags,
      targetLevel: conceptualLevel,
      selectionReason: 'ncm_assignment'
    },
    generated_at: Date.now()
  }
}

function toBankEntry(raw) {
  const ncmCode = normalizeNcmCode(raw?.ncm_code)
  const questionText = String(raw?.question_text || '').trim()
  const expectedAnswer = parseNumericAnswer(raw?.expected_answer)
  if (!ncmCode || !questionText || expectedAnswer === null) return null

  const operationTag = normalizeTag(raw?.operation_tag)
  const domainTag = normalizeTag(raw?.ncm_domain_tag)
  const abilityTags = normalizeAbilityTags(raw?.ability_tags)
  const expression = parseExpression(questionText)
  const type = resolveOperation(operationTag, abilityTags, expression?.type || '')
  const level = expression
    ? estimateExpressionLevel(type, expression.a, expression.b)
    : estimateDefaultLevel(ncmCode)
  const magnitude = buildMagnitude(expression)
  const estimatedTimeSec = estimatePromptTimeSec(questionText)

  return {
    ncmCode,
    itemNo: Number(raw?.item_no || 0) || 0,
    questionText,
    expectedAnswer,
    operationTag: operationTag || inferOperationTagFromType(type),
    domainTag: domainTag || 'unknown',
    abilityTags,
    type,
    values: expression ? { a: expression.a, b: expression.b } : {},
    magnitude,
    level,
    estimatedTimeSec,
    skillTag: `ncm_${ncmCode.toLowerCase()}_item_${Number(raw?.item_no || 0) || 0}`
  }
}

function normalizeTag(value) {
  return String(value || '').trim()
}

function normalizeAbilityTags(value) {
  return String(value || '')
    .split('|')
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

function normalizeCodeList(values) {
  return (Array.isArray(values) ? values : [])
    .map(item => normalizeNcmCode(item))
    .filter(Boolean)
}

function normalizeTagList(values) {
  return (Array.isArray(values) ? values : [])
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

function parseNumericAnswer(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return null
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function parseExpression(text) {
  const compact = String(text || '').trim()
  const match = compact.match(/^(-?(?:\d+|\d*[.,]\d+))\s*([+\-−×x*÷/])\s*(-?(?:\d+|\d*[.,]\d+))$/u)
  if (!match) return null

  const a = parseNumericAnswer(match[1])
  const b = parseNumericAnswer(match[3])
  if (a === null || b === null) return null

  const op = match[2]
  const type = inferTypeFromOperator(op)
  if (!type) return null

  return { a, b, type }
}

function inferTypeFromOperator(op) {
  if (op === '+') return 'addition'
  if (op === '-' || op === '−') return 'subtraction'
  if (op === '×' || op === 'x' || op === '*') return 'multiplication'
  if (op === '÷' || op === '/') return 'division'
  return ''
}

function resolveOperation(operationTag, abilityTags = [], expressionType = '') {
  if (KNOWN_OPERATIONS.has(operationTag)) return operationTag
  if (expressionType && KNOWN_OPERATIONS.has(expressionType)) return expressionType

  const hasAdd = abilityTags.includes('op_addition')
  const hasSub = abilityTags.includes('op_subtraction')
  const hasMul = abilityTags.includes('op_multiplication')
  const hasDiv = abilityTags.includes('op_division')
  const operationCount = [hasAdd, hasSub, hasMul, hasDiv].filter(Boolean).length

  if (operationCount === 1) {
    if (hasAdd) return 'addition'
    if (hasSub) return 'subtraction'
    if (hasMul) return 'multiplication'
    if (hasDiv) return 'division'
  }

  return 'addition'
}

function inferOperationTagFromType(type) {
  if (KNOWN_OPERATIONS.has(type)) return type
  return 'mixed'
}

function buildMagnitude(expression) {
  if (!expression) return {}
  return {
    a_digits: countDigits(expression.a),
    b_digits: countDigits(expression.b)
  }
}

function countDigits(value) {
  const numeric = Math.abs(Number(value))
  if (!Number.isFinite(numeric)) return 1
  const text = numeric.toString().replace('.', '')
  return Math.max(1, text.length)
}

function estimateExpressionLevel(type, a, b) {
  const maxDigits = Math.max(countDigits(a), countDigits(b))
  const usesDecimals = !Number.isInteger(a) || !Number.isInteger(b)

  if (usesDecimals) {
    if (type === 'addition' || type === 'subtraction') return 9
    if (type === 'multiplication') return 10
    if (type === 'division') return 11
    return 9
  }

  if (type === 'addition' || type === 'subtraction') {
    if (maxDigits <= 1) return 2
    if (maxDigits === 2) return 6
    if (maxDigits === 3) return 11
    return 12
  }
  if (type === 'multiplication') {
    if (maxDigits <= 1) return 4
    if (maxDigits === 2) return 8
    return 11
  }
  if (type === 'division') {
    if (maxDigits <= 2) return 5
    if (maxDigits === 3) return 8
    return 10
  }
  return 6
}

function estimateDefaultLevel(ncmCode) {
  if (ncmCode.startsWith('AS1')) return 6
  if (ncmCode.startsWith('AS2')) return 6
  if (ncmCode.startsWith('AS3')) return 7
  if (ncmCode.startsWith('AS4')) return 8
  if (ncmCode.startsWith('AS5')) return 8
  if (ncmCode.startsWith('AS6')) return 9
  if (ncmCode.startsWith('AS7')) return 10
  if (ncmCode.startsWith('AS8')) return 9
  if (ncmCode.startsWith('AS9')) return 10
  if (ncmCode.startsWith('AS10')) return 11
  if (ncmCode.startsWith('AS11')) return 11
  if (ncmCode.startsWith('RP')) return 10
  if (ncmCode.startsWith('SA')) return 9
  return 6
}

function estimatePromptTimeSec(questionText) {
  const textLength = String(questionText || '').trim().length
  const words = String(questionText || '').trim().split(/\s+/).filter(Boolean).length
  if (textLength <= 16 && words <= 3) return 18
  if (words <= 8) return 24
  if (words <= 18) return 34
  return 44
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function formatNcmAssignmentScope(assignment) {
  if (!assignment || assignment.kind !== 'ncm') return ''

  const codeLabels = normalizeCodeList(assignment.ncmCodes).map(code => getNcmCodeLabelSv(code))
  const abilityLabels = normalizeTagList(assignment.ncmAbilityTags).map(tag => getNcmAbilityLabelSv(tag))

  const parts = []
  if (codeLabels.length > 0) parts.push(`Koder: ${codeLabels.join(', ')}`)
  if (abilityLabels.length > 0) parts.push(`Förmågor: ${abilityLabels.join(', ')}`)
  return parts.join(' | ')
}

export function buildNcmAssignmentTitle(input = {}) {
  const codes = normalizeCodeList(input.ncmCodes)
  const abilities = normalizeTagList(input.ncmAbilityTags)
  if (codes.length === 1 && abilities.length === 0) {
    return `${getNcmCodeLabelSv(codes[0])} - mängdträning`
  }
  if (codes.length > 1 && abilities.length === 0) {
    return `NCM mix (${codes.join(', ')})`
  }
  if (abilities.length > 0 && codes.length === 0) {
    return `NCM förmåga (${abilities.map(tag => getNcmAbilityLabelSv(tag)).join(', ')})`
  }
  return 'NCM-uppdrag'
}

export function getNcmOperationLabelForCode(code) {
  const normalized = normalizeNcmCode(code)
  const match = NCM_SAFE_PROBLEM_BANK.find(item => item.ncmCode === normalized)
  if (!match) return 'blandat'
  return getNcmOperationLabelSv(match.operationTag)
}

export function getNcmDomainLabelForCode(code) {
  const normalized = normalizeNcmCode(code)
  const match = NCM_SAFE_PROBLEM_BANK.find(item => item.ncmCode === normalized)
  if (!match) return 'okänd'
  return getNcmDomainLabelSv(match.domainTag)
}
