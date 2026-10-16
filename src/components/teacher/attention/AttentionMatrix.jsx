import { FOCUS_DIMENSIONS, FOCUS_SIGNALS, describeFocusEvidence } from './attentionSignals'
import { localFocusSignal } from './attentionReference'

function Cell({ row, dimension, onSelect, reference }) {
  if (row.status !== 'ready') return <td>{row.status === 'error' ? 'Kunde inte hämtas' : 'Hämtar…'}</td>
  const signal = localFocusSignal(row, dimension.id, reference)
  return <td><button type="button" className={`focus-signal focus-signal-${signal.color}`} onClick={() => onSelect(row.studentId, dimension.mode)}
    data-testid={`focus-signal-${row.studentId}-${dimension.id}`} data-signal={signal.color}
    aria-label={`${row.name}, ${dimension.label}, ${dimension.exercise}, ${signal.label}, visa pass`}
    title={`${describeFocusEvidence(signal)} ${signal.trend.label}`}>
    <span className="focus-signal-mark" aria-hidden="true">{signal.mark}</span>
    <span className="focus-signal-label">{signal.label}</span>
    <span className="focus-signal-trend" aria-label={signal.trend.label}>{signal.trend.mark}</span>
  </button></td>
}

export default function AttentionMatrix({ rows, selectedId, onSelect, reference }) {
  return <>
    <div className="focus-table-scroll" tabIndex={0} role="region" aria-label="Gruppmatris för fokusövningar">
      <table className="focus-matrix focus-signal-matrix"><caption className="sr-only">Färger per elev och moment. Rött och orange är preliminära lokala uppföljningssignaler när tillräckligt jämförelseunderlag finns. Siffror finns i elevens detaljer.</caption>
        <thead><tr><th scope="col">Elev</th>{FOCUS_DIMENSIONS.map(dimension => <th scope="col" key={dimension.id}>{dimension.label}<span className="focus-column-exercise">{dimension.exercise}</span></th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.studentId} data-testid="focus-group-row" aria-selected={selectedId === row.studentId}>
          <th scope="row"><button type="button" onClick={() => onSelect(row.studentId)} className="focus-pupil-button">{row.name}</button></th>
          {FOCUS_DIMENSIONS.map(dimension => <Cell key={dimension.id} row={row} dimension={dimension} onSelect={onSelect} reference={reference} />)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="focus-signal-legend" aria-label="Färgernas betydelse">{Object.entries(FOCUS_SIGNALS).map(([color, signal]) =>
      <span key={color}><i className={`focus-signal-swatch focus-signal-${color}`} aria-hidden="true">{signal.mark}</i>{signal.label}</span>)}
    </div>
    <p className="focus-muted">FOKUS visar svarstid över flera dagar; Ej fullföljt är separat. Övriga moment: vit och streckad betyder mer underlag. Rött och orange kräver återkommande stora skillnader mot minst åtta andra elever. Ingen åldersnorm eller statistiskt säkerställd avvikelse.</p>
  </>
}
