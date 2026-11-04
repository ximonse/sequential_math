// Every short division on a notebook page (Simon 2026-11-03): the one printed from
// the task and the pupil's own, placed with the division button. Both work alike:
// a fraction bar under the numerator, the divisor centred under it, "=" and an
// answer line on the bar, and remainders in the crossings above the numerator.
const ANSWER_COLUMNS = 4
const isDigit = value => /^[0-9]$/u.test(value || '')

export function divisionLayouts(grid, template = null) {
  const layouts = []
  if (template) {
    const n = template.digits.length
    layouts.push({ id: 'printed', printed: true, row: template.row, first: template.first, width: n,
      numerator: template.digits.map((value, i) => ({ column: template.first + i, value })),
      equalsColumn: template.first + n, answerFirst: template.first + n + 1, answerColumns: template.answerColumns,
      answerLine: grid.answerLine || '', divisor: template.divisor })
  }
  for (const division of grid.divisions || []) {
    const numerator = []
    for (let column = division.column; column < grid.columns; column++) {
      const value = grid.cells?.[`${division.row}:${column}`]?.main
      if (!isDigit(value)) break
      numerator.push({ column, value })
    }
    // An empty division offers three columns. Once written, use the same width
    // as the printed template: exactly one column per numerator digit.
    const width = Math.min(numerator.length || 3, grid.columns - division.column)
    const equalsColumn = division.column + width
    layouts.push({ id: division.id, printed: false, row: division.row, first: division.column, width, numerator,
      equalsColumn, answerFirst: equalsColumn + 1,
      answerColumns: Math.max(0, Math.min(ANSWER_COLUMNS, grid.columns - equalsColumn - 1)),
      answerLine: grid.answerLines?.[division.id] || '' })
  }
  return layouts
}

// Tap areas for remainders: only in the row above a numerator, above its digits and
// half a cell to the right of the last one. Each cell is split down the middle: the
// left half writes in the crossing to its left, the right half in the crossing to
// its right. A cell with a large digit in it is never a tap area.
export function remainderTargets(grid, layouts) {
  const targets = []
  const taken = (row, column) => Boolean(grid.cells?.[`${row}:${column}`]?.main)
  for (const layout of layouts) {
    const row = layout.row - 1
    if (row < 0) continue
    const columns = layout.numerator.map(item => item.column)
    columns.forEach((column, index) => {
      if (taken(row, column)) return
      if (index > 0) targets.push({ row, column, half: 'left', note: { row: layout.row, column } })
      targets.push({ row, column, half: 'right', note: { row: layout.row, column: column + 1 } })
    })
    const after = (columns.at(-1) ?? layout.first - 1) + 1
    if (columns.length && after < grid.columns && !taken(row, after)) {
      targets.push({ row, column: after, half: 'left', note: { row: layout.row, column: after } })
    }
  }
  return targets
}

// The divisor (and anything else written under the bar) is shown centred under it.
export function divisorShifts(grid, layouts) {
  const shifts = new Map()
  for (const layout of layouts) {
    if (layout.printed) continue
    const row = layout.row + 1
    const filled = []
    for (let column = layout.first; column < layout.first + layout.width; column++) {
      if (grid.cells?.[`${row}:${column}`]?.main) filled.push(column)
    }
    if (!filled.length) continue
    const start = filled[0], span = filled.at(-1) - start + 1
    const shift = layout.first + (layout.width - span) / 2 - start
    if (shift) for (const column of filled) shifts.set(`${row}:${column}`, shift)
  }
  return shifts
}
