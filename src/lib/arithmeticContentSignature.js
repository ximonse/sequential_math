// Conservative content comparison for screening, which has no mastery level.
// Unknown/decimal/negative structures stay unknown; no level is invented.
export function arithmeticContentSignature(problem) {
  if (problem?.domain !== 'arithmetic') return null
  const { a, b } = problem.values ?? {}, operation = problem.type ?? problem.skill
  if (![a, b].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 999999)) return null
  const left = String(a), right = String(b), width = Math.max(left.length, right.length)
  const x = left.padStart(width, '0').split('').reverse().map(Number)
  const y = right.padStart(width, '0').split('').reverse().map(Number)
  const structure = []
  if (operation === 'addition' || operation === 'subtraction') {
    if (operation === 'subtraction' && a < b) return null
    let exchange = 0
    for (let index = 0; index < width; index++) {
      exchange = operation === 'addition' ? Number(x[index] + y[index] + exchange >= 10)
        : Number(x[index] - y[index] - exchange < 0)
      structure.push(exchange)
    }
    if (operation === 'subtraction') structure.push(left.split('').map(digit => digit === '0' ? '0' : 'x').join(''))
  } else if (operation === 'multiplication') {
    for (const factor of [...right].reverse().map(Number)) {
      let carry = 0
      const row = []
      for (const digit of [...left].reverse().map(Number)) {
        carry = Math.floor((digit * factor + carry) / 10)
        row.push(Number(carry > 0))
      }
      structure.push(row)
    }
  } else if (operation === 'division') {
    if (!b) return null
    let remainder = 0
    for (const digit of left) {
      const partial = remainder * 10 + Number(digit)
      structure.push([Number(Math.floor(partial / b) === 0), Number(partial % b !== 0)])
      remainder = partial % b
    }
    structure.push(b)
  } else return null
  return JSON.stringify([operation, left.length, right.length, structure])
}
