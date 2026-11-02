import { createElement as h } from 'react'

// Printed short division on the normal grid (see shortDivisionTemplate.js) and small
// digits written on vertical grid lines. Line digits can also be written in any task
// when the pupil turns on "skriv på linjerna" (Simon 2026-11-02).
// Read-only when no handlers are given (teacher history and PNG export).
const at = (column, row, extra = {}) => ({ left: `calc(var(--diagnostic-cell-width) * ${column})`,
  top: `calc(var(--diagnostic-cell-height) * ${row})`, ...extra })
const keyOf = gap => `${gap.row}:${gap.column}`

export default function ShortDivisionLayer({ template = null, lineNotes = {}, answer = '', selectedGap = null, extraGaps = [],
  answerActive = false, disabled = false, onGap = null, onAnswer = null, onGapKey = null }) {
  const notes = Object.entries(lineNotes || {})
  const interactive = Boolean(onGap)
  const gaps = new Map()
  if (interactive) for (const gap of [...(template?.gaps || []), ...extraGaps]) gaps.set(keyOf(gap), gap)
  if (!template && !notes.length && !gaps.size) return null
  const label = gap => {
    if (template?.gaps.some(item => keyOf(item) === keyOf(gap))) {
      return `Liten siffra mellan ${template.digits[gap.column - template.first - 1]} och ${template.digits[gap.column - template.first]}`
    }
    return `Liten siffra på linjen före rad ${gap.row + 1}, kolumn ${gap.column + 1}`
  }
  return h('div', { className: 'short-division', ...(template ? { 'data-short-division': `${template.digits.join('')}/${template.divisor}` } : {}) },
    template && [
      ...template.digits.map((digit, i) => h('span', { key: `d${i}`, className: 'short-division__given', style: at(template.first + i, template.row) }, digit)),
      h('span', { key: 'bar', className: 'short-division__bar', style: at(template.first, template.row + 1, { width: `calc(var(--diagnostic-cell-width) * ${template.digits.length})` }) }),
      h('span', { key: 'divisor', className: 'short-division__given', style: at(template.first + (template.digits.length - 1) / 2, template.row + 1) }, template.divisor),
      h('span', { key: 'eq', className: 'short-division__given', style: at(template.equalsColumn, template.row + 0.5) }, '='),
      interactive && onAnswer
        // The whole area right of "=" (both rows) leads to the answer; the visible line stays thin.
        ? h('button', { key: 'answer', type: 'button', className: 'short-division__answer-area',
          style: at(template.answerFirst, template.row, { width: `calc(var(--diagnostic-cell-width) * ${template.answerColumns})` }),
          'data-short-division-answer': true, disabled, 'aria-label': `Svar${answer ? `: ${answer}` : ', tomt'}`, onClick: onAnswer },
        h('span', { className: `short-division__answer ${answerActive ? 'short-division__answer--active' : ''}`,
          style: { left: 0, top: 'calc(var(--diagnostic-cell-height) * 0.5)', width: '100%' } }, answer))
        : h('span', { key: 'answer', className: 'short-division__answer', 'aria-label': `Svar: ${answer || 'tomt'}`,
          style: at(template.answerFirst, template.row + 0.5, { width: `calc(var(--diagnostic-cell-width) * ${template.answerColumns})` }) }, answer)
    ],
    notes.map(([key, value]) => {
      const [row, column] = key.split(':').map(Number)
      return h('span', { key: `n${key}`, className: 'short-division__note', 'data-line-note': key,
        style: at(column, row, { marginTop: '0.15rem' }) }, value)
    }),
    [...gaps.values()].map(gap => {
      const note = lineNotes?.[keyOf(gap)] || ''
      const selected = selectedGap && keyOf(selectedGap) === keyOf(gap)
      return h('button', { key: `g${keyOf(gap)}`, type: 'button', 'data-gap': keyOf(gap), disabled,
        'aria-label': `${label(gap)}${note ? `: ${note}` : ', tom'}`, 'aria-pressed': Boolean(selected),
        className: `short-division__gap ${selected ? 'short-division__gap--selected' : ''}`,
        style: at(gap.column - 0.5, gap.row, { width: 'var(--diagnostic-cell-width)', height: 'var(--diagnostic-cell-height)' }),
        onClick: () => onGap(gap), onKeyDown: event => onGapKey?.(event, gap) })
    }))
}
