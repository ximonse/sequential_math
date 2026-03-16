export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { [a, b] = [b, a % b] }
  return a
}

export function reduce(num, den) {
  if (den === 0) throw new Error('Division by zero in fraction reduce')
  const g = gcd(Math.abs(num), Math.abs(den))
  const sign = den < 0 ? -1 : 1
  return { num: sign * num / g, den: sign * den / g }
}

export function add(n1, d1, n2, d2) {
  return reduce(n1 * d2 + n2 * d1, d1 * d2)
}

export function sub(n1, d1, n2, d2) {
  return reduce(n1 * d2 - n2 * d1, d1 * d2)
}

export function mul(n1, d1, n2, d2) {
  return reduce(n1 * n2, d1 * d2)
}

export function formatFraction(num, den) {
  if (den === 1) return String(num)
  return `${num}/${den}`
}

/** Parse "3/4", "2", "-1/3" → { num, den } (raw), or null on failure */
export function parseFractionRaw(str) {
  const s = String(str || '').trim()
  if (s.includes('/')) {
    const parts = s.split('/')
    if (parts.length !== 2) return null
    const n = parseInt(parts[0], 10)
    const d = parseInt(parts[1], 10)
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null
    return { num: n, den: d }
  }
  const n = parseInt(s, 10)
  if (!Number.isFinite(n)) return null
  return { num: n, den: 1 }
}

/** Parse "3/4", "2", "-1/3" → { num, den } reduced, or null on failure */
export function parseFraction(str) {
  const parsed = parseFractionRaw(str)
  if (!parsed) return null
  return reduce(parsed.num, parsed.den)
}

export function isReducedFraction(fraction) {
  if (!fraction || !Number.isFinite(Number(fraction.num)) || !Number.isFinite(Number(fraction.den))) return false
  const reduced = reduce(Number(fraction.num), Number(fraction.den))
  return Number(fraction.num) === reduced.num && Number(fraction.den) === reduced.den
}

export function fractionsEqual(f1, f2) {
  if (!f1 || !f2) return false
  const r1 = reduce(f1.num, f1.den)
  const r2 = reduce(f2.num, f2.den)
  return r1.num === r2.num && r1.den === r2.den
}
