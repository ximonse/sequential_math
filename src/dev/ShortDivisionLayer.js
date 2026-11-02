import { createElement as h } from 'react'

// Printed short division on the normal grid (see shortDivisionTemplate.js).
// Read-only when no handlers are given (teacher history and PNG export).
const at = (column, row, extra = {}) => ({ left: `calc(var(--diagnostic-cell-width) * ${column})`,
  top: `calc(var(--diagnostic-cell-height) * ${row})`, ...extra })

export default function ShortDivisionLayer({ template, lineNotes = {}, answer = '', selectedGap = null,
  answerActive = false, disabled = false, onGap = null, onAnswer = null, onGapKey = null }) {
  if (!template) return null
  const { row, first, digits } = template
  const n = digits.length
  const interactive = Boolean(onGap)
  const gapKey = gap => `${gap.row}:${gap.column}`
  return h('div', { className: 'short-division', 'data-short-division': `${digits.join('')}/${template.divisor}` },
    digits.map((digit, i) => h('span', { key: `d${i}`, className: 'short-division__given', style: at(first + i, row) }, digit)),
    h('span', { className: 'short-division__bar', style: at(first, row + 1, { width: `calc(var(--diagnostic-cell-width) * ${n})` }) }),
    h('span', { className: 'short-division__given', style: at(first + (n - 1) / 2, row + 1) }, template.divisor),
    h('span', { className: 'short-division__given', style: at(template.equalsColumn, row + 0.5) }, '='),
    interactive
      ? h('button', { type: 'button', className: `short-division__answer ${answerActive ? 'short-division__answer--active' : ''}`,
        style: at(template.answerFirst, row + 0.5, { width: `calc(var(--diagnostic-cell-width) * ${template.answerColumns})` }),
        'data-short-division-answer': true, disabled, 'aria-label': `Svar${answer ? `: ${answer}` : ', tomt'}`, onClick: onAnswer }, answer)
      : h('span', { className: 'short-division__answer', 'aria-label': `Svar: ${answer || 'tomt'}`,
        style: at(template.answerFirst, row + 0.5, { width: `calc(var(--diagnostic-cell-width) * ${template.answerColumns})` }) }, answer),
    template.gaps.map(gap => {
      const note = lineNotes[gapKey(gap)] || ''
      const selected = selectedGap && gapKey(selectedGap) === gapKey(gap)
      const style = at(gap.column - 0.5, gap.row, { width: 'var(--diagnostic-cell-width)', height: 'var(--diagnostic-cell-height)' })
      const label = `Liten siffra mellan ${digits[gap.column - first - 1]} och ${digits[gap.column - first]}${note ? `: ${note}` : ', tom'}`
      return interactive
        ? h('button', { key: gapKey(gap), type: 'button', 'data-gap': gapKey(gap), disabled, 'aria-label': label,
          'aria-pressed': Boolean(selected), className: `short-division__gap ${selected ? 'short-division__gap--selected' : ''}`,
          style, onClick: () => onGap(gap), onKeyDown: event => onGapKey?.(event, gap) },
        note && h('span', { className: 'short-division__note' }, note))
        : note && h('span', { key: gapKey(gap), className: 'short-division__gap', style, 'aria-label': label },
          h('span', { className: 'short-division__note' }, note))
    }))
}
