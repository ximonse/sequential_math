function tokenize(raw) {
  const normalized = String(raw || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/,/g, '.')
    .replace(/\s+/g, '')
  const tokens = normalized.match(/\d+(?:\.\d+)?|[a-zA-Z]+|[()+\-*/]/g) || []
  if (tokens.join('') !== normalized) throw new Error('unsupported expression token')

  const expanded = []
  for (const token of tokens) {
    const previous = expanded.at(-1)
    const previousCanMultiply = previous && (/^(?:\d|[a-zA-Z]|\))/.test(previous))
    const currentCanMultiply = /^(?:\d|[a-zA-Z]|\()/.test(token)
    if (previousCanMultiply && currentCanMultiply) expanded.push('*')
    expanded.push(token)
  }
  return expanded
}

export function evaluateExpression(raw, variables = {}) {
  const tokens = tokenize(raw)
  let index = 0

  function parsePrimary() {
    const token = tokens[index]
    if (token === '(') {
      index += 1
      const value = parseAdditive()
      if (tokens[index] !== ')') throw new Error('missing closing parenthesis')
      index += 1
      return value
    }
    if (token === '-') {
      index += 1
      return -parsePrimary()
    }
    if (/^\d/.test(token || '')) {
      index += 1
      return Number(token)
    }
    if (/^[a-zA-Z]+$/.test(token || '')) {
      index += 1
      const value = Number(variables[token])
      if (!Number.isFinite(value)) throw new Error(`missing variable ${token}`)
      return value
    }
    throw new Error('expected number, variable or parenthesis')
  }

  function parseMultiplicative() {
    let value = parsePrimary()
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index]
      index += 1
      const right = parsePrimary()
      if (operator === '/' && right === 0) throw new Error('division by zero')
      value = operator === '*' ? value * right : value / right
    }
    return value
  }

  function parseAdditive() {
    let value = parseMultiplicative()
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index]
      index += 1
      const right = parseMultiplicative()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }

  if (tokens.length === 0) throw new Error('empty expression')
  const value = parseAdditive()
  if (index !== tokens.length) throw new Error('unexpected expression tail')
  if (!Number.isFinite(value)) throw new Error('expression result is not finite')
  return value
}

export function nearlyEqual(left, right, epsilon = 1e-9) {
  return Number.isFinite(Number(left))
    && Number.isFinite(Number(right))
    && Math.abs(Number(left) - Number(right)) <= epsilon
}
