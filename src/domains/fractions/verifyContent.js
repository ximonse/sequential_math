function gcd(left, right) {
  let a = Math.abs(Math.trunc(left))
  let b = Math.abs(Math.trunc(right))
  while (b !== 0) [a, b] = [b, a % b]
  return a || 1
}

function canonical(num, den) {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) {
    throw new Error('invalid fraction')
  }
  const sign = den < 0 ? -1 : 1
  const divisor = gcd(num, den)
  return { num: sign * num / divisor, den: sign * den / divisor }
}

function parseOperand(raw) {
  const [numRaw, denRaw = '1'] = String(raw || '').trim().split('/')
  return canonical(Number(numRaw), Number(denRaw))
}

function calculate(left, operator, right) {
  if (operator === '+') {
    return canonical(left.num * right.den + right.num * left.den, left.den * right.den)
  }
  if (operator === '-') {
    return canonical(left.num * right.den - right.num * left.den, left.den * right.den)
  }
  if (operator === '*') return canonical(left.num * right.num, left.den * right.den)
  throw new Error(`unsupported fraction operator ${operator}`)
}

function evaluateFractionPrompt(raw) {
  const expression = String(raw || '')
    .replace(/^Förenkla:\s*/i, '')
    .replace(/\s*\(Förenkla svaret\.\)\s*$/i, '')
    .replace(/−/g, '-')
    .replace(/×/g, '*')
    .trim()
  const operands = expression.split(/\s*[+\-*]\s*/).filter(Boolean).map(parseOperand)
  const operators = expression.match(/[+\-*]/g) || []
  if (operands.length === 0 || operators.length !== operands.length - 1) {
    throw new Error('invalid fraction expression')
  }
  return operands.slice(1).reduce(
    (value, operand, index) => calculate(value, operators[index], operand),
    operands[0]
  )
}

export function verifyFractionsContent(problem) {
  try {
    const expected = evaluateFractionPrompt(problem?.display?.text || problem?.values?.text)
    const actual = canonical(Number(problem?.answer?.num), Number(problem?.answer?.den ?? 1))
    return {
      valid: expected.num === actual.num && expected.den === actual.den,
      reason: `expected ${expected.num}/${expected.den}, received ${actual.num}/${actual.den}`
    }
  } catch (error) {
    return { valid: false, reason: String(error?.message || error) }
  }
}
