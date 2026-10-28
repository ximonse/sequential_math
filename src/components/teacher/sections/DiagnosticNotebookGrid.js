import { createElement as h } from 'react'
import { diagnosticLineCoordinates } from '../../../domains/arithmetic/diagnosticLineGeometry.js'

// Shared by teacher history and the local PNG renderer. No controls or writes.
export default function DiagnosticNotebookGrid({ frame, label = 'Elevens sparade uppställning' }) {
  return h('div', { className: 'diagnostic-grid', role: 'grid', 'aria-label': label,
    style: { gridTemplateColumns: `repeat(${frame.columns}, var(--diagnostic-cell-width))` } },
  h('svg', { className: 'diagnostic-grid__lines', viewBox: `0 0 ${frame.columns} ${frame.rows}`,
    preserveAspectRatio: 'none', 'aria-hidden': true },
  (frame.lines || []).map(line => h('line', { key: line.id, 'data-line-id': line.id,
    ...diagnosticLineCoordinates(line), className: 'diagnostic-grid__line' }))),
  Array.from({ length: frame.rows * frame.columns }, (_, index) => {
    const row = Math.floor(index / frame.columns), column = index % frame.columns
    const cell = frame.cells[`${row}:${column}`] || {}
    return h('div', { key: `${row}:${column}`, 'data-export-cell': `${row}:${column}`,
      className: `diagnostic-cell ${cell.note ? 'diagnostic-cell--note' : ''}`, role: 'gridcell',
      'aria-label': `rad ${row + 1}, kolumn ${column + 1}, ${cell.main || cell.note || 'tom'}` },
    cell.main && h('span', { className: `diagnostic-cell__digit diagnostic-cell__digit--main ${cell.main.length > 1 ? 'diagnostic-cell__digit--double' : ''} ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}` }, cell.main),
    cell.note && h('span', { className: `diagnostic-cell__digit diagnostic-cell__digit--note ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}` }, cell.note))
  }))
}
