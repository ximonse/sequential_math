import { ATTENTION_LABELS } from '../../../lib/attentionHistory'
import { attentionNumber, attentionPercent } from '../../../lib/attentionStatistics'
import { FOCUS_MODES } from './attentionGroup'

function Rate({ label, rate }) {
  return <div className="focus-rate"><div><span>{label}</span><strong>{attentionPercent(rate)}</strong></div>
    <div className="focus-meter" aria-hidden="true"><span style={{ width: `${rate.percent ?? 0}%` }} /></div>
    <small>{rate.total ? `${rate.correct} av ${rate.total}` : 'Underlag saknas'}</small></div>
}

function Cell({ row, mode, onSelect }) {
  const group = row.groups[mode]
  if (row.status !== 'ready') return <td>{row.status === 'error' ? 'Kunde inte hämtas' : 'Hämtar…'}</td>
  if (!group?.completed) return <td><span className="focus-muted">{group?.aborted ? `Enbart avbrutna (${group.aborted})` : 'Inga färdiga pass'}</span></td>
  const descriptionId = `focus-cell-${row.studentId}-${mode}`
  return <td><button type="button" className="focus-cell" onClick={() => onSelect(row.studentId, mode)} aria-label={`${row.name}, ${ATTENTION_LABELS[mode]}, visa pass`} aria-describedby={descriptionId}>
    <div id={descriptionId}>
    {mode === 'multi' ? <><Rate label="Alla uppgifter" rate={group.accuracy} /><Rate label="Bytt regel" rate={group.switch} /></>
      : <><Rate label="Gröna signaler" rate={group.go} />{mode === 'choose' && <Rate label="Avstådda stopp" rate={group.stop} />}</>}
    <small>{group.completed} färdiga · {group.aborted} avbrutna{mode !== 'multi' ? ` · ${attentionNumber(group.earlyPerMinute)} tidiga/min` : ''}</small>
    </div>
  </button></td>
}

export default function AttentionMatrix({ rows, selectedId, onSelect }) {
  return <div className="focus-table-scroll" tabIndex={0} role="region" aria-label="Gruppmatris för fokusövningar">
    <table className="focus-matrix"><caption className="sr-only">Färdiga tvåminuterspass per elev och övning. Staplar går från 0 till 100 procent.</caption>
      <thead><tr><th scope="col">Elev</th>{FOCUS_MODES.map(mode => <th scope="col" key={mode}>{ATTENTION_LABELS[mode]}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.studentId} data-testid="focus-group-row" aria-selected={selectedId === row.studentId}>
        <th scope="row"><button type="button" onClick={() => onSelect(row.studentId)} className="focus-pupil-button">{row.name}</button></th>
        {FOCUS_MODES.map(mode => <Cell key={mode} row={row} mode={mode} onSelect={onSelect} />)}
      </tr>)}</tbody>
    </table>
  </div>
}
