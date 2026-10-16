import { attentionEndurance } from '../../../lib/attentionEndurance'

const labels = { go: 'Gröna signaler', stop: 'Avstå-signal', first: 'Första uppgiften', repeat: 'Upprepad regel', switch: 'Bytt regel' }
const seconds = ms => `${Math.round(ms / 1000)} s`

export default function AttentionEndurance({ pass }) {
  const data = attentionEndurance(pass)
  if (!data) return <p className="focus-muted">Äldre pass: tidpunkter saknas, så utvecklingen inom passet kan inte visas.</p>
  const max = pass.mode === 'discover' ? 5000 : pass.mode === 'choose' ? 2000 : 4000
  const x = ms => 52 + ms / 120000 * 550
  const y = ms => 150 - ms / max * 120
  const slowing = data.series.filter(series => series.slowerFrom !== null)
  return <section aria-label="Utveckling under passet" className="focus-endurance">
    <h4>Utveckling under passet</h4>
    <p className="focus-muted">Aktiv tid från start. Punkter visar svarstid, × feltryck och streck uteblivna svar. Avstådda stopp visas längst ned. Dold flik räknas bort.</p>
    <svg viewBox="0 0 640 190" className="focus-chart" role="img" aria-label="Svar för svar under två minuter">
      <title>Svarstid och utfall under passet</title><desc>Varje signal har en punkt eller markör. Värden finns även i tabellen Signaler under passet.</desc>
      {[0, max / 2, max].map(value => <g key={value} className="focus-grid-line"><line x1="52" x2="602" y1={y(value)} y2={y(value)} /><text x="46" y={y(value) + 4} textAnchor="end">{value}</text></g>)}
      {[0, 30, 60, 90, 120].map(value => <g key={value} className="focus-grid-line"><line x1={x(value * 1000)} x2={x(value * 1000)} y1="30" y2="150" /><text x={x(value * 1000)} y="180" textAnchor="middle">{value} s</text></g>)}
      <text x="52" y="17">Svarstid (ms)</text>
      {pass.trials.map((trial, i) => <g key={i} className={`focus-series-${trial.kind === 'switch' ? 1 : 0}`}>
        {trial.responseMs !== null ? trial.outcome === 'wrong'
          ? <text x={x(trial.at)} y={y(trial.responseMs) + 4} textAnchor="middle">×</text>
          : trial.kind === 'switch' ? <rect x={x(trial.at) - 3} y={y(trial.responseMs) - 3} width="6" height="6" /> : <circle cx={x(trial.at)} cy={y(trial.responseMs)} r="3" />
          : <text x={x(trial.at)} y={trial.outcome === 'withheld' ? 162 : 27} textAnchor="middle">{trial.outcome === 'withheld' ? '·' : '—'}</text>}
        <title>{seconds(trial.at)} · {labels[trial.kind]} · {trial.outcome === 'miss' ? 'Inget svar' : trial.outcome === 'withheld' ? 'Korrekt avstått' : `${Math.round(trial.responseMs)} ms${trial.outcome === 'wrong' ? ', feltryck' : ''}`}</title>
      </g>)}
      {pass.aborted && <g className="focus-grid-line"><line x1={x(pass.activeMs)} x2={x(pass.activeMs)} y1="20" y2="165" strokeDasharray="4 3" /><title>Försöket slutade vid {seconds(pass.activeMs)}</title></g>}
    </svg>
    {pass.mode === 'multi' && <p className="focus-muted">● Upprepad regel · ■ Bytt regel. Första uppgiften visas som punkt och ingår inte i jämförelsen.</p>}
    {slowing.map(series => <p key={series.kind}>Längre svar från cirka {seconds(series.slowerFrom)} · {labels[series.kind].toLowerCase()}. Mönstret syns i två följande 30-sekundersdelar jämfört med starten.</p>)}
    {!slowing.length && <p className="focus-muted">{data.series.some(series => series.canAssess) ? 'Ingen tydlig varaktig ökning av svarstiden i jämförbara svar.' : 'För få jämförbara svar för att bedöma förändring under passet. Registrerade signaler visas i diagrammet.'}</p>}
    {data.unansweredFrom !== null && <p>Uteblivna svar från {seconds(data.unansweredFrom)}{pass.completionReason === 'no_response' ? `; omstart erbjöds vid ${seconds(pass.activeMs)}` : ' vid minst två följande svarssignaler'}.</p>}
    <p className="focus-muted">Det visar vad som hände, inte varför. Ökad svarstid, trötthet, regelbyte och avbrott kan ha flera orsaker. Inget automatiskt omdöme om intresse eller koncentration.</p>
    <details><summary>Signaler under passet · {pass.trials.length}</summary><table className="focus-matrix"><thead><tr><th>Tid</th><th>Signal</th><th>Utfall</th><th>Svarstid</th></tr></thead><tbody>{pass.trials.map((trial, i) => <tr key={i}><td>{seconds(trial.at)}</td><td>{labels[trial.kind]}</td><td>{{ hit: 'Rätt svar', wrong: 'Feltryck', miss: 'Inget svar', withheld: 'Korrekt avstått' }[trial.outcome]}</td><td>{trial.responseMs === null ? '–' : `${Math.round(trial.responseMs)} ms`}</td></tr>)}</tbody></table></details>
  </section>
}
