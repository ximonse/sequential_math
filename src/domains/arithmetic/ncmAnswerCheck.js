// Checks a pupil's answer against an NCM facit entry. The pupil may add a unit
// ("147 kr"), write "x = 2", use comma or point and spaces in large numbers.
const NUMBER = /[−-]?\d+(?:[.,]\d+)?/gu

function normalize(text) {
  return String(text || '').trim().toLowerCase().replace(/[−–]/gu, '-').replace(/(\d)\s+(?=\d{3}\b)/gu, '$1')
}

function numbersIn(text) {
  return [...normalize(text).matchAll(NUMBER)].map(match => Number(match[0].replace(',', '.').replace('−', '-')))
}

const close = (a, b) => Math.abs(a - b) < 1e-9

function fractionValue(text) {
  const match = normalize(text).replace(/\s+/gu, ' ').match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/u)
  if (!match || Number(match[3]) === 0) return null
  return Number(match[1] || 0) + Number(match[2]) / Number(match[3])
}

// 'incomplete' means no answer of the expected kind could be read at all.
export function checkNcmAnswer(task, answer) {
  const text = normalize(answer)
  if (!text) return 'unanswered'
  const expected = task.expected || []
  if (task.answerFormat === 'text') {
    const plain = text.replace(/[\s.!]/gu, '')
    return expected.some(item => normalize(item).replace(/[\s.!]/gu, '') === plain) ? 'correct' : 'incorrect'
  }
  if (task.answerFormat === 'fraction') {
    const value = fractionValue(text)
    if (value === null) return 'incomplete'
    return close(value, expected[0] / expected[1]) ? 'correct' : 'incorrect'
  }
  const numbers = numbersIn(text)
  if (numbers.length === 0) return 'incomplete'
  if (task.answerFormat === 'numbers') {
    return numbers.length === expected.length && numbers.every((value, index) => close(value, expected[index])) ? 'correct' : 'incorrect'
  }
  // A single number, possibly after "x =" or before a unit; a stray second number is wrong.
  if (numbers.length !== 1) return 'incorrect'
  if (task.answerFormat === 'between') return numbers[0] > expected[0] && numbers[0] < expected[1] ? 'correct' : 'incorrect'
  return close(numbers[0], expected[0]) ? 'correct' : 'incorrect'
}
