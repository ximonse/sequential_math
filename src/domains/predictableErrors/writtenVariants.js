// Written-calculation variants from Simon's reading of real screening answers,
// 2026-11-14 (proposals by Gemini and the agent, checked against the answers).
const digitsOf = n => String(n).split('').map(Number)

// Counting on the fingers from the start number when the ones are exchanged:
// 13 − 7 and 14 − 8 both become 7 (503 − 267 = 237, 574 − 238 = 337).
export function subInclusiveCount(a, b) {
  return a % 10 < b % 10 ? a - b + 1 : null
}

// Columns that lend in a whole-number subtraction (1 = tens, 2 = hundreds).
function lendingColumns(a, b) {
  const x = digitsOf(a).reverse(), y = digitsOf(b).reverse(), columns = []
  let borrow = 0
  for (let i = 0; i < x.length; i++) {
    const top = x[i] - borrow, bottom = y[i] ?? 0
    borrow = top < bottom ? 1 : 0
    if (borrow) columns.push(i + 1)
  }
  return columns
}

// One of several exchanges leaves the lending column undecreased
// (621 − 384 = 247 in the tens, 337 in the hundreds; 732 − 458 = 374).
// Only without zeros in the first number, where exchanging across zero differs.
export function subOneExchangeKept(a, b) {
  const columns = lendingColumns(a, b)
  if (columns.length < 2 || digitsOf(a).includes(0)) return []
  return columns.map(column => ({ column, value: a - b + 10 ** column }))
}

// Exchanging across a zero in the tens decreases the hundreds twice and turns the
// zero into ten (402 − 178: 2 − 1, 10 − 7, 12 − 8 = 134).
export function subZeroDoubleDecrement(a, b) {
  const [h, t, o] = digitsOf(a), bh = Math.floor(b / 100) % 10, bt = Math.floor(b / 10) % 10
  if (a < 100 || a > 999 || t !== 0 || o >= b % 10 || h - 2 < bh) return null
  return (h - 2 - bh) * 100 + (10 - bt) * 10 + (o + 10 - b % 10)
}

// The carry into the highest digit is forgotten while the others are kept
// (146 · 4: 24, 16 + 2 = 18, 4 without the 1 = 484).
export function mulLastCarryForgotten(m, k) {
  const x = digitsOf(m).reverse()
  if (x.length < 3) return null
  let carry = 0, carries = 0
  for (let i = 0; i < x.length - 1; i++) { carry = Math.floor((x[i] * k + carry) / 10); if (carry) carries++ }
  return carries >= 2 ? m * k - carry * 10 ** (x.length - 1) : null
}

// A wrong table fact for the ones digit inside the setup, with the rest of the
// algorithm right (46 · 7 with 7 · 6 as 36 or 48 gives 316 or 328).
export function mulOnesFactWrong(m, k) {
  const d = m % 10, rest = (m - d) * k
  if (m < 10 || d < 2) return []
  // Only the neighbouring row of the table: (d ± 1) · k equals the adjacent product of the whole task.
  const wrong = [d * (k - 1), d * (k + 1)].filter(value => value >= 0 && value !== d * k)
  return [...new Set(wrong)].map(value => rest + value)
}
