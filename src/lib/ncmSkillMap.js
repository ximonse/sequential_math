const MANUAL_NCM_SKILL_MAP = Object.freeze({
  AS1: buildManual('arithmetic', 'addition', [
    'ncm_arithmetic',
    'ncm_written_method',
    'op_addition',
    'multi_digit'
  ], 'high'),
  AS2: buildManual('arithmetic', 'subtraction', [
    'ncm_arithmetic',
    'ncm_written_method',
    'op_subtraction',
    'multi_digit'
  ], 'high'),
  AS3: buildManual('arithmetic', 'mixed', [
    'ncm_arithmetic',
    'ncm_word_problem',
    'op_addition',
    'op_subtraction'
  ], 'high'),
  AS4: buildManual('arithmetic', 'multiplication', [
    'ncm_arithmetic',
    'ncm_written_method',
    'op_multiplication'
  ], 'high'),
  AS5: buildManual('arithmetic', 'division', [
    'ncm_arithmetic',
    'ncm_written_method',
    'op_division'
  ], 'medium'),
  AS6: buildManual('arithmetic', 'mixed', [
    'ncm_arithmetic',
    'ncm_word_problem',
    'op_multiplication',
    'op_division'
  ], 'high'),
  AS7: buildManual('arithmetic', 'multiplication', [
    'ncm_arithmetic',
    'ncm_written_method',
    'op_multiplication',
    'multi_digit'
  ], 'high'),
  AS8: buildManual('arithmetic', 'division', [
    'ncm_arithmetic',
    'ncm_written_method',
    'op_division'
  ], 'medium'),
  AS9: buildManual('arithmetic', 'mixed', [
    'ncm_arithmetic',
    'concept_decimal',
    'op_addition',
    'op_subtraction'
  ], 'high'),
  AS10: buildManual('arithmetic', 'multiplication', [
    'ncm_arithmetic',
    'concept_decimal',
    'op_multiplication'
  ], 'high'),
  AS11: buildManual('arithmetic', 'division', [
    'ncm_arithmetic',
    'concept_decimal',
    'op_division'
  ], 'medium')
})

const PREFIX_RULES = [
  buildPrefixRule('AUP', 'arithmetic', 'mixed', ['ncm_arithmetic', 'ncm_place_value']),
  buildPrefixRule('AUN', 'arithmetic', 'mixed', ['ncm_arithmetic', 'ncm_number_sense']),
  buildPrefixRule('AS', 'arithmetic', 'mixed', ['ncm_arithmetic', 'ncm_written_method']),
  buildPrefixRule('AG', 'arithmetic', 'mixed', ['ncm_arithmetic', 'ncm_basic_number_operations']),
  buildPrefixRule('AF', 'arithmetic', 'mixed', ['ncm_arithmetic']),
  buildPrefixRule('RB', 'rational_numbers', 'mixed', ['ncm_rational_numbers', 'concept_fraction']),
  buildPrefixRule('RD', 'rational_numbers', 'mixed', ['ncm_rational_numbers', 'concept_decimal']),
  buildPrefixRule('RP', 'rational_numbers', 'mixed', ['ncm_rational_numbers', 'concept_percent']),
  buildPrefixRule('GFO', 'geometry', 'mixed', ['ncm_geometry']),
  buildPrefixRule('GSK', 'geometry', 'mixed', ['ncm_geometry']),
  buildPrefixRule('GVI', 'geometry', 'mixed', ['ncm_geometry']),
  buildPrefixRule('G', 'geometry', 'mixed', ['ncm_geometry']),
  buildPrefixRule('M', 'measurement', 'mixed', ['ncm_measurement']),
  buildPrefixRule('ST', 'statistics_probability', 'mixed', ['ncm_statistics_probability']),
  buildPrefixRule('SA', 'statistics_probability', 'mixed', ['ncm_statistics_probability']),
  buildPrefixRule('TA', 'number_sense', 'mixed', ['ncm_number_sense'])
]

function buildManual(domainTag, operationTag, abilityTags, mappingConfidence) {
  return {
    domainTag,
    operationTag,
    abilityTags: Object.freeze([...abilityTags]),
    mappingConfidence,
    mappingSource: 'manual'
  }
}

function buildPrefixRule(prefix, domainTag, operationTag, abilityTags) {
  return Object.freeze({
    prefix,
    domainTag,
    operationTag,
    abilityTags: Object.freeze([...abilityTags])
  })
}

export function normalizeNcmCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/%20/g, '')
    .replace(/[^A-Z0-9]/g, '')
}

export function getNcmSkillMapping(code) {
  const normalized = normalizeNcmCode(code)
  if (!normalized) {
    return {
      code: '',
      domainTag: 'unknown',
      operationTag: 'mixed',
      abilityTags: ['ncm_unknown'],
      mappingConfidence: 'low',
      mappingSource: 'fallback'
    }
  }

  const manual = MANUAL_NCM_SKILL_MAP[normalized]
  if (manual) {
    return {
      code: normalized,
      domainTag: manual.domainTag,
      operationTag: manual.operationTag,
      abilityTags: [...manual.abilityTags],
      mappingConfidence: manual.mappingConfidence,
      mappingSource: manual.mappingSource
    }
  }

  for (const rule of PREFIX_RULES) {
    if (normalized.startsWith(rule.prefix)) {
      return {
        code: normalized,
        domainTag: rule.domainTag,
        operationTag: rule.operationTag,
        abilityTags: [...rule.abilityTags],
        mappingConfidence: 'heuristic',
        mappingSource: `prefix:${rule.prefix}`
      }
    }
  }

  return {
    code: normalized,
    domainTag: 'unknown',
    operationTag: 'mixed',
    abilityTags: ['ncm_unknown'],
    mappingConfidence: 'low',
    mappingSource: 'fallback'
  }
}

export function mapNcmCodes(codes) {
  const safeCodes = Array.isArray(codes) ? codes : []
  return safeCodes.map(code => getNcmSkillMapping(code))
}

export { MANUAL_NCM_SKILL_MAP }
