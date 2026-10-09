import { diagnosticLineCoordinates } from '../domains/arithmetic/diagnosticLineGeometry'

export default function DiagnosticGridLines({ lines = [], preview = null, rows, columns }) {
  return <svg className="diagnostic-grid__lines" viewBox={`0 0 ${columns} ${rows}`}
    preserveAspectRatio="none" aria-hidden="true">
    {[...lines, ...(preview ? [{ ...preview, id: 'preview' }] : [])].map(line => <line
      key={line.id} data-line-id={line.id} {...diagnosticLineCoordinates(line)}
      className={line.id === 'preview' ? 'diagnostic-grid__line--preview' : 'diagnostic-grid__line'} />)}
  </svg>
}
