import { createElement as h } from 'react'

// Short divisions on the normal grid (see divisionLayout.js): the one printed from the
// task and the pupil's own. Remainders sit in the crossing above the numerator, a
// decimal comma in the crossing below a row (Simon 2026-11-03).
// Read-only when no handlers are given (teacher history and PNG export).
const at = (column, row, extra = {}) => ({ left: `calc(var(--diagnostic-cell-width) * ${column})`,
  top: `calc(var(--diagnostic-cell-height) * ${row})`, ...extra })
const cells = count => `calc(var(--diagnostic-cell-width) * ${count})`
const noteKey = note => `${note.row}:${note.column}`

export default function ShortDivisionLayer({ layouts = [], lineNotes = {}, targets = [], selectedNote = null, activeAnswer = null,
  disabled = false, onTarget = null, onAnswer = null, onTargetKey = null }) {
  const notes = Object.entries(lineNotes || {})
  const interactive = Boolean(onTarget)
  if (!layouts.length && !notes.length) return null
  const caretShown = new Set()
  return h('div', { className: 'short-division' },
    layouts.map(layout => {
      const active = activeAnswer === layout.id
      const answerText = [layout.answerLine, active && h('span', { key: 'caret', className: 'notebook-caret', 'aria-hidden': true })]
      return h('div', { key: layout.id, 'data-short-division': layout.printed ? `${layout.numerator.map(item => item.value).join('')}/${layout.divisor}` : `own:${layout.id}` },
        layout.printed && layout.numerator.map(item => h('span', { key: `d${item.column}`, className: 'short-division__given', style: at(item.column, layout.row) }, item.value)),
        h('span', { className: 'short-division__bar', style: at(layout.first, layout.row + 1, { width: cells(layout.width) }) }),
        layout.printed && h('span', { className: 'short-division__given', style: at(layout.first + (layout.width - 1) / 2, layout.row + 1) }, layout.divisor),
        h('span', { className: 'short-division__given', style: at(layout.equalsColumn, layout.row + 0.5) }, '='),
        layout.answerColumns > 0 && (interactive && onAnswer
          // The whole area right of "=" (both rows) leads to the answer line; the visible line stays thin.
          ? h('button', { type: 'button', className: 'short-division__answer-area', style: at(layout.answerFirst, layout.row, { width: cells(layout.answerColumns) }),
            'data-short-division-answer': layout.id, disabled, 'aria-label': `Svarslinje i uppställningen${layout.answerLine ? `: ${layout.answerLine}` : ', tom'}`,
            onClick: () => onAnswer(layout.id) },
          h('span', { className: `short-division__answer ${active ? 'short-division__answer--active' : ''}`,
            style: { left: 0, top: 'calc(var(--diagnostic-cell-height) * 0.5)', width: '100%' } }, answerText))
          : h('span', { className: 'short-division__answer', 'aria-label': `Svarslinje i uppställningen: ${layout.answerLine || 'tom'}`,
            style: at(layout.answerFirst, layout.row + 0.5, { width: cells(layout.answerColumns) }) }, layout.answerLine)))
    }),
    notes.map(([key, value]) => {
      const [row, column, place] = key.split(':')
      const bottom = place === 'bottom'
      return h('span', { key: `n${key}`, className: `short-division__note ${bottom ? 'short-division__note--comma' : ''}`, 'data-line-note': key,
        style: at(Number(column), Number(row) + (bottom ? 1 : 0)) }, value)
    }),
    interactive && targets.map(target => {
      const key = noteKey(target.note)
      const note = lineNotes?.[key] || ''
      const selected = selectedNote && noteKey(selectedNote) === key
      const showCaret = selected && !caretShown.has(key)
      if (showCaret) caretShown.add(key)
      return h('button', { key: `${target.row}:${target.column}:${target.half}`, type: 'button', 'data-gap': key, 'data-target-half': target.half, disabled,
        'aria-label': `Minnessiffra i krysset före kolumn ${target.note.column + 1}${note ? `: ${note}` : ', tom'}`, 'aria-pressed': Boolean(selected),
        className: `short-division__gap short-division__gap--${target.half}`,
        style: at(target.column + (target.half === 'right' ? 0.5 : 0), target.row, { width: cells(0.5), height: 'var(--diagnostic-cell-height)' }),
        onClick: () => onTarget(target), onKeyDown: event => onTargetKey?.(event, target) },
      showCaret && h('span', { className: `notebook-caret short-division__gap-caret ${note ? 'short-division__gap-caret--after' : ''}`, 'aria-hidden': true }))
    }))
}
