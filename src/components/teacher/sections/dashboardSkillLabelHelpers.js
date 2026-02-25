import {
  extractNcmCodeFromValue,
  getNcmDomainLabelSv,
  getNcmOperationLabelSv,
  getNcmSkillMapping
} from '../../../lib/ncmSkillMap'

const SKILL_TYPE_LABEL_OVERRIDES = {
  mul_table_drill: 'Tabellträning'
}

const SKILL_OPERATION_SYMBOLS = {
  add: '+',
  sub: '-',
  mul: '*',
  div: '/'
}

const SKILL_QUALIFIER_LABELS = {
  no_carry: 'utan övergång',
  carry: 'med övergång',
  with_carry: 'med övergång',
  no_borrow: 'utan lån',
  borrow: 'med lån',
  easy: 'enkel',
  basic: 'grund',
  full: 'full',
  guided: 'guidad',
  intro: 'intro',
  foundation: 'grund',
  tens_friendly: 'tiotalsvänlig',
  small: 'små tal'
}

export function formatSkillList(list) {
  if (!Array.isArray(list) || list.length === 0) return '-'
  return list
    .slice(0, 6)
    .map(item => formatSkillTypeLabel(item))
    .filter(Boolean)
    .join(', ') || '-'
}

export function formatSkillTypeLabel(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const ncmCode = extractNcmCodeFromValue(raw)
  if (ncmCode) {
    const ncmMapping = getNcmSkillMapping(ncmCode)
    return formatNcmSkillLabel(ncmCode, ncmMapping)
  }

  if (Object.prototype.hasOwnProperty.call(SKILL_TYPE_LABEL_OVERRIDES, raw)) {
    return SKILL_TYPE_LABEL_OVERRIDES[raw]
  }

  const parts = raw.split('_')
  const operationPrefix = parts[0]
  const symbol = SKILL_OPERATION_SYMBOLS[operationPrefix]
  if (!symbol) return raw

  let tokenIndex = 1
  let decimalMode = false
  if (parts[tokenIndex] === 'dec') {
    decimalMode = true
    tokenIndex += 1
  }

  const leftToken = parts[tokenIndex]
  const rightToken = parts[tokenIndex + 1]
  if (!leftToken || !rightToken) return raw

  const left = formatSkillOperandToken(leftToken, decimalMode, operationPrefix)
  const right = formatSkillOperandToken(rightToken, decimalMode, operationPrefix)
  if (!left || !right) return raw

  const qualifier = formatSkillQualifier(parts.slice(tokenIndex + 2))
  const base = `${left}${symbol}${right}`
  return qualifier ? `${base} (${qualifier})` : base
}

function formatSkillOperandToken(token, decimalMode, operationPrefix) {
  const text = String(token || '').trim()
  if (!text) return ''

  const dpMatch = text.match(/^(\d+)dp$/)
  if (dpMatch) {
    const digits = Number(dpMatch[1])
    if (!Number.isInteger(digits) || digits <= 0) return text
    return `${digits},${digits}`
  }

  const dMatch = text.match(/^(\d+)d$/)
  if (dMatch) {
    const digits = Number(dMatch[1])
    if (!Number.isInteger(digits) || digits <= 0) return text
    if (decimalMode && (operationPrefix === 'add' || operationPrefix === 'sub') && digits >= 2) {
      return `${digits},1`
    }
    return `${digits}`
  }

  return text
}

function formatSkillQualifier(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return ''
  const key = parts.join('_')
  if (Object.prototype.hasOwnProperty.call(SKILL_QUALIFIER_LABELS, key)) {
    return SKILL_QUALIFIER_LABELS[key]
  }
  return key.replace(/_/g, ' ')
}

function formatNcmSkillLabel(code, mapping) {
  const ncmCode = String(code || '').trim()
  if (!ncmCode) return ''
  const operationLabel = getNcmOperationLabelSv(mapping?.operationTag)
  const domainLabel = getNcmDomainLabelSv(mapping?.domainTag)
  return `NCM ${ncmCode} (${operationLabel}, ${domainLabel})`
}
