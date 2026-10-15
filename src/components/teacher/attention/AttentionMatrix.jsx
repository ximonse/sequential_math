import { FOCUS_DIMENSIONS, FOCUS_SIGNALS, describeFocusEvidence, focusSignal } from './attentionSignals'

function Cell({ row, dimension, onSelect }) {
  if (row.status !== 'ready') return <td>{row.status === 'error' ? 'Kunde inte hämtas' : 'Hämtar…'}</td>
  const signal = focusSignal(row.history, dimension.id)
  return <td><button type="button" className={`focus-signal focus-signal-${signal.color}`} onClick={() => onSelect(row.studentId, dimension.mode)}
    data-testid={`focus-signal-${row.studentId}-${dimension.id}`} data-signal={signal.color}
    aria-label={`${row.name}, ${dimension.label}, ${dimension.exercise}, ${signal.label}, visa pass`}
    title={`${describeFocusEvidence(signal)} ${signal.trend.label}`}>
    <span className="focus-signal-mark" aria-hidden="true">{signal.mark}</span>
    <span className="focus-signal-label">{signal.label}</span>
    <span className="focus-signal-trend" aria-label={signal.trend.label}>{signal.trend.mark}</span>
  </button></td>
}

export default function AttentionMatrix({ rows, selectedId, onSelect }) {
  return <>
    <div className="focus-table-scroll" tabIndex={0} role="region" aria-label="Gruppmatris för fokusövningar">
      <table className="focus-matrix focus-signal-matrix"><caption className="sr-only">Preliminära beskrivande färger per elev och förmåga i övningen. Siffror och underlag finns när en elev väljs. Rött och orange används inte ännu.</caption>
        <thead><tr><th scope="col">Elev</th>{FOCUS_DIMENSIONS.map(dimension => <th scope="col" key={dimension.id}>{dimension.label}<span className="focus-column-exercise">{dimension.exercise}</span></th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.studentId} data-testid="focus-group-row" aria-selected={selectedId === row.studentId}>
          <th scope="row"><button type="button" onClick={() => onSelect(row.studentId)} className="focus-pupil-button">{row.name}</button></th>
          {FOCUS_DIMENSIONS.map(dimension => <Cell key={dimension.id} row={row} dimension={dimension} onSelect={onSelect} />)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="focus-signal-legend" aria-label="Färgernas betydelse">{Object.entries(FOCUS_SIGNALS).map(([color, signal]) =>
      <span key={color}><i className={`focus-signal-swatch focus-signal-${color}`} aria-hidden="true">{signal.mark}</i>{signal.label}</span>)}
    </div>
    <p className="focus-muted">Vit och streckad: mer underlag behövs. Färgerna beskriver övningsresultat med preliminära fasta gränser. Rött och orange är avstängda tills en utprövad jämförelsereferens finns.</p>
  </>
}
