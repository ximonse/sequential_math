import { checkNcmAnswer } from './ncmAnswerCheck.js'

export const SCREENING_ANSWER_FORMATS = ['number', 'fraction', 'mixed', 'numbers', 'text']
const fail = () => { throw new Error('Ange ett giltigt facit för det valda svarsformatet.') }
const clean = value => String(value).trim().replace(/[−–]/gu, '-').replace(/\u00a0/gu, ' ')
const numeric = /^[+-]?(?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d+)?$/u
const finite = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e12 && Number(value.toFixed(12)) === value
const displayNumber = value => value.toLocaleString('sv-SE', { useGrouping: false, maximumFractionDigits: 12 })
const unitFamilies = [['l', 'liter', 'litre', 'litres'], ['ml', 'milliliter', 'millilitre', 'millilitres'],
  ['kg', 'kilogram'], ['g', 'gram'], ['m', 'meter', 'metre', 'metres'], ['kr', 'kronor', 'sek']]

// Teacher-only, frozen answer data. Never include this object in pupil payloads.
export function normalizeScreeningAnswerKey(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !['format', 'expected', 'unit', 'denominator'].includes(key))
    || !SCREENING_ANSWER_FORMATS.includes(input.format) || !Array.isArray(input.expected)) fail()
  const { format, expected } = input
  if (format === 'text') {
    if (!expected.length || expected.length > 12 || expected.some(value => typeof value !== 'string' || !value.trim() || value.length > 100) || input.unit || input.denominator !== undefined) fail()
    return { format, expected: expected.map(value => value.trim()) }
  }
  const count = ['fraction', 'mixed'].includes(format) ? 2 : format === 'number' ? 1 : expected.length
  if (!expected.every(finite) || expected.length !== count
    || (format === 'numbers' && (expected.length < 2 || expected.length > 8))) fail()
  if (['fraction', 'mixed'].includes(format) && (!expected.every(Number.isSafeInteger) || expected[1] <= 0
    || (format === 'mixed' && (expected[0] < expected[1] || expected[0] < 0)))) fail()
  const unit = input.unit === undefined ? '' : input.unit
  if (typeof unit !== 'string' || unit.length > 20 || (unit && !/^[\p{L}%²³ ]+$/u.test(unit)) || (format !== 'number' && unit)) fail()
  if (input.denominator !== undefined && (format !== 'fraction' || input.denominator !== expected[1])) fail()
  return { format, expected: [...expected], ...(unit ? { unit: unit.trim() } : {}),
    ...(input.denominator !== undefined ? { denominator: input.denominator } : {}) }
}

export function screeningAnswerKeyLabel(input) {
  const key = normalizeScreeningAnswerKey(input), [a, b] = key.expected
  if (key.format === 'text') return key.expected.join(' / ')
  if (key.format === 'fraction') return `${a}/${b}`
  if (key.format === 'mixed') return `${Math.floor(a / b)} ${a % b}/${b}`
  return key.expected.map(displayNumber).join('; ') + (key.unit ? ` ${key.unit}` : '')
}

// Text input in the teacher editor becomes the same validated API contract.
export function screeningAnswerKeyFromText(format, text, unit = '', requireDenominator = false) {
  const value = clean(text)
  if (format === 'text') return normalizeScreeningAnswerKey({ format, expected: value.split(';').map(part => part.trim()) })
  if (['fraction', 'mixed'].includes(format)) {
    const match = value.match(format === 'mixed' ? /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/u : /^(-?\d+)\s*\/\s*(\d+)$/u)
    if (!match) fail()
    const expected = format === 'mixed' ? [Number(match[1]) * Number(match[3]) + Number(match[2]), Number(match[3])] : [Number(match[1]), Number(match[2])]
    if (format === 'mixed' && Number(match[2]) >= Number(match[3])) fail()
    return normalizeScreeningAnswerKey({ format, expected, ...(format === 'fraction' && requireDenominator ? { denominator: expected[1] } : {}) })
  }
  const parts = format === 'numbers' ? value.split(';').map(part => part.trim()) : [value]
  if (parts.some(part => !numeric.test(part))) fail()
  return normalizeScreeningAnswerKey({ format, expected: parts.map(part => Number(part.replace(/ /gu, '').replace(',', '.'))), ...(unit ? { unit } : {}) })
}

export function checkScreeningAnswerKey(input, answer) {
  const key = normalizeScreeningAnswerKey(input)
  let text = clean(answer).toLowerCase()
  if (!text) return 'unanswered'
  if (key.format === 'text') return checkNcmAnswer({ answerFormat: 'text', expected: key.expected }, text)
  if (key.format === 'number') {
    text = text.replace(/^x\s*=\s*/u, '')
    if (key.unit) {
      const aliases = unitFamilies.find(family => family.includes(key.unit.toLowerCase())) || [key.unit.toLowerCase()]
      const suffix = aliases.find(unit => text.endsWith(unit))
      if (suffix) text = text.slice(0, -suffix.length).trim()
    }
    if (!numeric.test(text)) return /\d/u.test(text) ? 'incorrect' : 'incomplete'
    const value = Number(text.replace(/ /gu, '').replace(',', '.'))
    return checkNcmAnswer({ answerFormat: 'number', expected: key.expected }, text) === 'correct' && value === key.expected[0] ? 'correct' : 'incorrect'
  }
  if (['fraction', 'mixed'].includes(key.format)) {
    const match = text.match(key.format === 'mixed' ? /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/u : /^(-?\d+)\s*\/\s*(\d+)$/u)
    if (!match) return 'incomplete'
    const parts = match.slice(1).map(Number)
    if (!parts.every(Number.isSafeInteger)) return 'incorrect'
    const denominator = parts[key.format === 'mixed' ? 2 : 1]
    if (!denominator || (key.format === 'mixed' && parts[1] >= denominator)) return 'incorrect'
    if (key.denominator !== undefined && denominator !== key.denominator) return 'incorrect'
    const numerator = key.format === 'mixed' ? BigInt(parts[0]) * BigInt(denominator) + BigInt(parts[1]) : BigInt(parts[0])
    return numerator * BigInt(key.expected[1]) === BigInt(key.expected[0]) * BigInt(denominator) ? 'correct' : 'incorrect'
  }
  // Ordered multi-part answers use an explicit separator; never extract a
  // coincidentally correct number from an expression or an explanation.
  const parts = text.split(/\s*(?:;|\boch\b|\band\b)\s*/u)
  if (parts.length !== key.expected.length || parts.some(part => !numeric.test(part))) return 'incorrect'
  return parts.every((part, index) => checkScreeningAnswerKey({ format: 'number', expected: [key.expected[index]] }, part) === 'correct') ? 'correct' : 'incorrect'
}
