// Written multiplication and short division error rules (step 4, approved by
// Simon 2026-11-02). Each returns the answer the rule produces, or null.
const digits = n => String(n).split('').map(Number)

// Multi-digit times one digit: one digit at a time from the ones.
function rowOne(m, k, rule) {
  const ds = digits(m).reverse()
  let carry = 0, out = 0
  for (let i = 0; i < ds.length; i++) {
    const last = i === ds.length - 1
    const product = rule === 'carry_added_before' ? (ds[i] + carry) * k : ds[i] * k + (rule === 'carry_forgotten' ? 0 : carry)
    out += (last ? product : product % 10) * 10 ** i
    // carry_always_one: any carry is written as 1 (46 × 7 = 292, blind test 3).
    carry = rule === 'carry_always_one' ? (product >= 10 ? 1 : 0) : Math.floor(product / 10)
  }
  return out
}

export function mulCarryForgotten(m, k) { return rowOne(m, k, 'carry_forgotten') }
export function mulCarryAddedBefore(m, k) { return rowOne(m, k, 'carry_added_before') }
export function mulCarryAlwaysOne(m, k) { return rowOne(m, k, 'carry_always_one') }
export function mulPartialsConcatenated(m, k) { return Number(digits(m).map(d => d * k).join('')) }

// Only digits in the same column are multiplied, as in addition; the carry from the
// ones is added to the next column (46 × 7 = 82, 34 × 23 = 72).
export function mulColumnwise(a, b) {
  const x = digits(a).reverse(), y = digits(b).reverse()
  let carry = 0, out = 0
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const value = (x[i] !== undefined && y[i] !== undefined ? x[i] * y[i] : (x[i] ?? y[i])) + carry
    const last = i === Math.max(x.length, y.length) - 1
    out += (last ? value : value % 10) * 10 ** i
    carry = last ? 0 : Math.floor(value / 10)
  }
  return out
}

// Two-digit (or longer) times two-digit: rows per digit of the second factor.
export function mulRows(a, b, rule) {
  const row = d => rule === 'partials_concatenated' ? mulPartialsConcatenated(a, d) : rule && rule !== 'no_row_shift' ? rowOne(a, d, rule) : a * d
  const rows = digits(b).reverse().map((d, i) => ({ value: row(d), shift: i }))
  return rule === 'no_row_shift' ? rows.reduce((sum, row) => sum + a * digits(b).reverse()[row.shift], 0)
    : rows.reduce((sum, row) => sum + row.value * 10 ** row.shift, 0)
}

// Short division by one digit, left to right.
function shortDivision(a, b, rule) {
  let remainder = 0, started = false, quotient = ''
  for (const d of digits(a)) {
    const current = !started ? remainder * 10 + d : rule === 'remainder_ignored' ? d : rule === 'remainder_as_ones' ? remainder + d : remainder * 10 + d
    if (!started && current < b) { remainder = current; continue }
    started = true
    quotient += String(Math.floor(current / b))
    remainder = current % b
  }
  return quotient ? Number(quotient) : 0
}

export function divRemainderIgnored(a, b) { return shortDivision(a, b, 'remainder_ignored') }
export function divRemainderAsOnes(a, b) { return shortDivision(a, b, 'remainder_as_ones') }
// Zeros in the quotient fall away: inside (108 -> 18) or last (80 -> 8, blind test 3).
export function divZeroDropped(quotient) {
  const text = String(quotient)
  const variants = [/\d0+\d/u.test(text) ? text[0] + text.slice(1, -1).replace(/0/gu, '') + text.at(-1) : null,
    text.length > 1 ? text[0] + text.slice(1).replace(/0/gu, '') : null]
  return [...new Set(variants.filter(v => v && v !== text).map(Number))]
}
