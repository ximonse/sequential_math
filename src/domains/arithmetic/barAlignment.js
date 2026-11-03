// A pupil's own short division (Simon 2026-11-03): when "=" is written right of a
// fraction bar, in the row above or below it, "=" and the answer after it are shown
// centred on the bar, as on paper. Only the display moves; the cells stay the pupil's.
// Returns a map "row:column" -> 'down' (shown half a row lower) or 'up'.
export function barAlignedCells(grid, cursor = null) {
  const out = new Map()
  const main = (row, column) => grid.cells?.[`${row}:${column}`]?.main || ''
  for (const line of grid.lines || []) {
    if (line.axis !== 'horizontal' || line.placement !== 'grid-border') continue
    const end = line.to.column
    // The row above the bar is tried first, then the row below.
    for (const [row, direction] of [[line.from.row, 'down'], [line.from.row + 1, 'up']]) {
      if (row < 0 || row >= grid.rows) continue
      const start = [end + 1, end + 2].find(column => column < grid.columns && main(row, column) === '=')
      if (start === undefined) continue
      for (let column = start; column < grid.columns; column++) {
        const atCursor = cursor && cursor.row === row && cursor.column === column
        if (!main(row, column) && !atCursor) break
        if (!out.has(`${row}:${column}`)) out.set(`${row}:${column}`, direction)
        // The empty cell where the next answer digit goes moves along too.
        if (!main(row, column)) break
      }
      break
    }
  }
  return out
}
