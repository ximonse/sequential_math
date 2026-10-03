function lineCoordinates(line) {
  return line.axis === 'horizontal'
    ? { x1: line.from.column + 0.08, y1: line.from.row + 0.88,
      x2: line.to.column + 0.92, y2: line.from.row + 0.88 }
    : { x1: line.from.column + 0.88, y1: line.from.row + 0.08,
      x2: line.from.column + 0.88, y2: line.to.row + 0.92 }
}

export default function DiagnosticGridLines({ lines = [], preview = null, rows, columns }) {
  return <svg className="diagnostic-grid__lines" viewBox={`0 0 ${columns} ${rows}`}
    preserveAspectRatio="none" aria-hidden="true">
    {[...lines, ...(preview ? [{ ...preview, id: 'preview' }] : [])].map(line => <line
      key={line.id} data-line-id={line.id} {...lineCoordinates(line)}
      className={line.id === 'preview' ? 'diagnostic-grid__line--preview' : 'diagnostic-grid__line'} />)}
  </svg>
}
