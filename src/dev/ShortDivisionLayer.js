import { createElement as h } from 'react'

// Printed short division on the normal grid (see shortDivisionTemplate.js) and marks
// written on vertical grid lines: small digits sit in the crossing above the cell
// row, a decimal comma in the crossing below it (Simon 2026-11-02).
// Read-only when no handlers are given (teacher history and PNG export).
const at = (column, row, extra = {}) => ({ left: `calc(var(--diagnostic-cell-width) * ${column})`,
  top: `calc(var(--diagnostic-cell-height) * ${row})`, ...extra })
const keyOf = gap => `${gap.row}:${gap.column}`

export default function ShortDivisionLayer({ template = null, lineNotes = {}, answerLine = '', selectedGap = null, extraGaps = [],
  answerActive = false, disabled = false, onGap = null, onAnswer = null, onGapKey = null }) {
  const notes = Object.entries(lineNotes || {})
  const interactive = Boolean(onGap)
  const gaps = new Map()
  if (interactive) for (const gap of [...(template?.gaps || []), ...extraGaps]) gaps.set(keyOf(gap), gap)
  if (!template && !notes.length && !gaps.size) return null
  const printedGap = gap => Boolean(template?.gaps.some(item => keyOf(item) === keyOf(gap)))
  const label = gap => {
    if (printedGap(gap)) {
      return `Liten siffra mellan ${template.digits[gap.column - template.first - 1]} och ${template.digits[gap.column - template.first]}`
    }
    return `Liten siffra på linjen före rad ${gap.row + 1}, kolumn ${gap.column + 1}`
  }
  const answerWidth = template && `calc(var(--diagnostic-cell-width) * ${template.answerColumns})`
  const answerText = [answerLine, answerActive && h('span', { key: 'caret', className: 'notebook-caret', 'aria-hidden': true })]
  return h('div', { className: 'short-division', ...(template ? { 'data-short-division': `${template.digits.join('')}/${template.divisor}` } : {}) },
    template && [
      ...template.digits.map((digit, i) => h('span', { key: `d${i}`, className: 'short-division__given', style: at(template.first + i, template.row) }, digit)),
      h('span', { key: 'bar', className: 'short-division__bar', style: at(template.first, template.row + 1, { width: `calc(var(--diagnostic-cell-width) * ${template.digits.length})` }) }),
      h('span', { key: 'divisor', className: 'short-division__given', style: at(template.first + (template.digits.length - 1) / 2, template.row + 1) }, template.divisor),
      h('span', { key: 'eq', className: 'short-division__given', style: at(template.equalsColumn, template.row + 0.5) }, '='),
      interactive && onAnswer
        // The whole area right of "=" (both rows) leads to the answer line; the visible line stays thin.
        ? h('button', { key: 'answer', type: 'button', className: 'short-division__answer-area',
          style: at(template.answerFirst, template.row, { width: answerWidth }),
          'data-short-division-answer': true, disabled, 'aria-label': `Svarslinje i uppställningen${answerLine ? `: ${answerLine}` : ', tom'}`, onClick: onAnswer },
        h('span', { className: `short-division__answer ${answerActive ? 'short-division__answer--active' : ''}`,
          style: { left: 0, top: 'calc(var(--diagnostic-cell-height) * 0.5)', width: '100%' } }, answerText))
        : h('span', { key: 'answer', className: 'short-division__answer', 'aria-label': `Svarslinje i uppställningen: ${answerLine || 'tom'}`,
          style: at(template.answerFirst, template.row + 0.5, { width: answerWidth }) }, answerLine)
    ],
    notes.map(([key, value]) => {
      const [row, column, place] = key.split(':')
      const bottom = place === 'bottom'
      return h('span', { key: `n${key}`, className: `short-division__note ${bottom ? 'short-division__note--comma' : ''}`, 'data-line-note': key,
        style: at(Number(column), Number(row) + (bottom ? 1 : 0)) }, value)
    }),
    [...gaps.values()].map(gap => {
      const note = lineNotes?.[keyOf(gap)] || ''
      const selected = selectedGap && keyOf(selectedGap) === keyOf(gap)
      return h('button', { key: `g${keyOf(gap)}`, type: 'button', 'data-gap': keyOf(gap), disabled,
        'aria-label': `${label(gap)}${note ? `: ${note}` : ', tom'}`, 'aria-pressed': Boolean(selected),
        className: `short-division__gap ${selected ? 'short-division__gap--selected' : ''}`,
        // Over printed digits the whole width can be used; elsewhere only the band around
        // the line, so the middle of every cell still takes ordinary digits and "=".
        style: printedGap(gap)
          ? at(gap.column - 0.5, gap.row, { width: 'var(--diagnostic-cell-width)', height: 'var(--diagnostic-cell-height)' })
          : at(gap.column - 0.22, gap.row, { width: 'calc(var(--diagnostic-cell-width) * 0.44)', height: 'var(--diagnostic-cell-height)' }),
        onClick: () => onGap(gap), onKeyDown: event => onGapKey?.(event, gap) },
      selected && h('span', { className: `notebook-caret short-division__gap-caret ${note ? 'short-division__gap-caret--after' : ''}`, 'aria-hidden': true }))
    }))
}
