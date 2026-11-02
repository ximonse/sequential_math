// Columns worked from the left (blind test 2, 2026-11-01; approved 2026-11-02).
// Addition: a column's carry goes to the column on its right and the last carry is lost.
// Subtraction: a column that is too small takes ten and borrows from the column on its right.
const columns = (a, b) => {
  const width = Math.max(String(a).length, String(b).length)
  return [String(a).padStart(width, '0').split('').map(Number), String(b).padStart(width, '0').split('').map(Number)]
}

export function addLeftToRight(a, b) {
  const [top, bottom] = columns(a, b)
  let carry = 0
  const out = top.map((d, i) => { const sum = d + bottom[i] + carry; carry = Math.floor(sum / 10); return sum % 10 })
  return Number(out.join(''))
}

export function subLeftToRight(a, b) {
  const [top, bottom] = columns(a, b)
  const work = [...top]
  const out = work.map((_, i) => {
    if (work[i] >= bottom[i]) return work[i] - bottom[i]
    if (i < work.length - 1 && work[i + 1] > 0) work[i + 1] -= 1
    return 10 + work[i] - bottom[i]
  })
  return Number(out.join(''))
}
