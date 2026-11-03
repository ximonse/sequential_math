// Short division in the notebook (Simon 2026-11-02): the task's own numbers are
// printed on the normal grid with a fraction bar, the divisor and an equals sign.
// Small digits are written on the vertical lines between the dividend digits, and
// the answer line right of "=" is the attempt's ordinary answer. The template is
// derived from the task text and is never part of the pupil's cells or lines.
// 55/5, 55//5, 55:5 and 55 ÷ 5 all work alike (Simon 2026-11-03).
const PROMPT = /^(?:(?:Räkna ut|Beräkna)\s+)?(\d{2,4})\s*(?:\/\/|[/÷:])\s*([2-9])\s*[.=?]?$/u
// Centred and a little above the middle of the normal 8 x 12 grid; the row above
// the numerator is free for remainders.
const ROW = 2
const COLUMNS = 12
const ANSWER_COLUMNS = 4

export function shortDivisionTemplate(task) {
  const match = PROMPT.exec(String(task?.promptSv ?? '').trim())
  if (!match || task?.gridEnabled === false || task?.responseMode) return null
  const digits = match[1].split('')
  const n = digits.length
  const first = Math.floor((COLUMNS - (n + 1 + ANSWER_COLUMNS)) / 2)
  return {
    row: ROW, first, digits, divisor: match[2],
    divisorColumn: first + Math.floor((n - 1) / 2),
    equalsColumn: first + n,
    answerFirst: first + n + 1, answerColumns: ANSWER_COLUMNS,
    // Borders between two dividend digits, named by the column to their right.
    gaps: digits.slice(1).map((_, i) => ({ row: ROW, column: first + i + 1 })),
    lastColumn: first + n + ANSWER_COLUMNS
  }
}

// Cells the template uses; the pupil does not write in them.
export function templateCovers(template, row, column) {
  return Boolean(template) && row >= template.row && row <= template.row + 1
    && column >= template.first && column <= template.lastColumn
}

// Decided once per attempt from the whole event stream: older attempts where the
// pupil ever wrote where the template would go keep their plain grid, at every
// history step, so the teacher never sees a template the pupil did not see.
export function shortDivisionTemplateFor(task, grid) {
  const template = shortDivisionTemplate(task)
  if (!template || !grid || template.lastColumn >= grid.columns || template.row + 1 >= grid.rows) return null
  const covered = key => { const [row, column] = key.split(':').map(Number); return templateCovers(template, row, column) }
  const blocked = Object.entries(grid.cells || {}).some(([key, cell]) => (cell.main || cell.note) && covered(key))
    || (grid.events || []).some(event => ['write', 'reclassify'].includes(event.type) && event.position
      && templateCovers(template, event.position.row, event.position.column))
  return blocked ? null : template
}

export function isTemplateGap(template, position) {
  return Boolean(template) && template.gaps.some(gap => gap.row === position?.row && gap.column === position?.column)
}
