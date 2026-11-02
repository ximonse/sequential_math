// Short division in the notebook (Simon 2026-11-02): the task's own numbers are
// printed on the normal grid with a fraction bar, the divisor and an equals sign.
// Small digits are written on the vertical lines between the dividend digits, and
// the answer line right of "=" is the attempt's ordinary answer. The template is
// derived from the task text and is never part of the pupil's cells or lines.
const PROMPT = /^Räkna ut (\d{2,4}) ?[/÷] ?([2-9])\.?$/u
const ROW = 1
const FIRST = 1
const ANSWER_COLUMNS = 4

export function shortDivisionTemplate(task) {
  const match = PROMPT.exec(String(task?.promptSv ?? '').trim())
  if (!match || task?.gridEnabled === false || task?.responseMode) return null
  const digits = match[1].split('')
  const n = digits.length
  return {
    row: ROW, first: FIRST, digits, divisor: match[2],
    divisorColumn: FIRST + Math.floor((n - 1) / 2),
    equalsColumn: FIRST + n,
    answerFirst: FIRST + n + 1, answerColumns: ANSWER_COLUMNS,
    // Borders between two dividend digits, named by the column to their right.
    gaps: digits.slice(1).map((_, i) => ({ row: ROW, column: FIRST + i + 1 })),
    lastColumn: FIRST + n + ANSWER_COLUMNS
  }
}

// Cells the template uses; the pupil does not write in them.
export function templateCovers(template, row, column) {
  return Boolean(template) && row >= template.row && row <= template.row + 1
    && column >= template.first && column <= template.lastColumn
}

// Older attempts that already have work where the template would go keep their
// plain grid, so nothing the pupil wrote is hidden.
export function shortDivisionTemplateFor(task, grid) {
  const template = shortDivisionTemplate(task)
  if (!template || !grid || template.lastColumn >= grid.columns || template.row + 1 >= grid.rows) return null
  const blocked = Object.entries(grid.cells || {}).some(([key, cell]) => {
    const [row, column] = key.split(':').map(Number)
    return (cell.main || cell.note) && templateCovers(template, row, column)
  })
  return blocked ? null : template
}

export function isTemplateGap(template, position) {
  return Boolean(template) && template.gaps.some(gap => gap.row === position?.row && gap.column === position?.column)
}
