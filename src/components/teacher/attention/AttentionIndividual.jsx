import { useState } from 'react'
import { ATTENTION_LABELS } from '../../../lib/attentionHistory'
import { attentionPassStatistics, attentionNumber } from '../../../lib/attentionStatistics'
import AttentionPassStatistics from '../sections/AttentionPassStatistics'
import AttentionSignalDetails from './AttentionSignalDetails'

const date = time => new Date(time).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' })

function Timeline({ results, mode, measure }) {
  const full = results.filter(pass => !pass.aborted).sort((a, b) => a.finishedAt - b.finishedAt || a.id.localeCompare(b.id))
  const series = mode === 'multi' ? ['Upprepad regel', 'Bytt regel'] : mode === 'choose' && measure === 'accuracy' ? ['Gröna signaler', 'Avstådda stopp'] : ['Gröna signaler']
  const values = full.map(pass => {
    const stats = attentionPassStatistics(pass)
    return { pass, values: measure === 'time'
      ? mode === 'multi' ? [pass.summary.repeat.median, pass.summary.switch.median] : [pass.summary.median]
      : mode === 'multi' ? [stats.repeat.percent, stats.switch.percent] : mode === 'choose' ? [stats.go.percent, stats.stop.percent] : [stats.go.percent] }
  })
  if (!values.some(item => item.values.some(value => value !== null))) return <p className="focus-empty">Inga färdiga pass med underlag för tidslinjen i urvalet.</p>
  const start = full[0].finishedAt
  const end = full.at(-1).finishedAt
  const x = time => end === start ? 335 : 65 + (time - start) / (end - start) * 545
  const max = measure === 'time' ? mode === 'multi' ? 4000 : 2000 : 100
  const y = value => 240 - value / max * 200
  return <>
    <div className="focus-legend">{series.map((label, i) => <span key={label}><i className={`focus-series-${i}`} />{label}</span>)}</div>
    <svg viewBox="0 0 640 295" className="focus-chart" role="img" aria-label={`Pass över tid, ${measure === 'time' ? 'medianreaktionstid i millisekunder' : 'träffsäkerhet i procent'}`}>
      <title>Varje punkt är ett färdigt pass</title><desc>Värdena finns också i passdetaljerna nedanför. Saknade värden ritas inte.</desc>
      {[0, .25, .5, .75, 1].map(tick => <g key={tick} className="focus-grid-line"><line x1="65" x2="610" y1={y(tick * max)} y2={y(tick * max)} /><text x="55" y={y(tick * max) + 4} textAnchor="end">{tick * max}</text></g>)}
      <text x="65" y="20" className="focus-axis-title">{measure === 'time' ? 'Median för rätta svar (ms)' : 'Rätt / avstått (%)'}</text>
      {values.flatMap(({ pass, values: rates }) => rates.map((value, i) => value === null ? null : <g key={`${pass.id}-${i}`} className={`focus-series-${i}`}>
        {i === 0 ? <circle cx={x(pass.finishedAt)} cy={y(value)} r="5" /> : <rect x={x(pass.finishedAt) - 4} y={y(value) - 4} width="8" height="8" />}
        <title>{date(pass.finishedAt)} · {series[i]}: {attentionNumber(value)} {measure === 'time' ? 'ms' : '%'}</title>
      </g>))}
      <text x="65" y="268">{date(start)}</text>{end !== start && <text x="610" y="287" textAnchor="end">{date(end)}</text>}
    </svg>
    <p className="focus-muted">{full.length} färdiga pass. Tid mellan passen visas proportionellt. Avbrutna pass ingår bara i detaljerna. Svarstider jämförs per pass, utan gemensam median.</p>
  </>
}

export default function AttentionIndividual({ row, mode }) {
  const [measure, setMeasure] = useState('accuracy')
  const [limit, setLimit] = useState(5)
  const results = row.history.filter(pass => pass.mode === mode)
  return <section className="focus-individual" aria-label="Individens fokusresultat">
    <div className="focus-section-heading"><div><p className="focus-eyebrow">Individ · {ATTENTION_LABELS[mode]}</p><h3>{row.name}</h3></div>
      <label>Visa i tidslinjen<select aria-label="Mått i elevens tidslinje" value={measure} onChange={event => setMeasure(event.target.value)}>
        <option value="accuracy">Träffsäkerhet</option><option value="time">Svarstid per pass</option>
      </select></label></div>
    {row.status !== 'ready' ? <p role="status">{row.status === 'error' ? 'Elevens resultat kunde inte hämtas. Försök uppdatera gruppen.' : 'Hämtar elevens resultat…'}</p>
      : <><AttentionSignalDetails row={row} mode={mode} /><Timeline results={results} mode={mode} measure={measure} />
        <details><summary>Passdetaljer · {results.length} pass</summary>
          {!results.length && <p>Inga sparade pass i urvalet.</p>}
          {results.slice(0, limit).map(pass => <article className="focus-pass" key={pass.id}>
            <h4>{date(pass.finishedAt)} · {pass.aborted ? 'Avbrutet' : 'Färdigt'} · {Math.round(pass.activeMs / 1000)} s</h4>
            <AttentionPassStatistics result={pass} />
          </article>)}
          {results.length > limit && <button type="button" className="focus-action" onClick={() => setLimit(value => value + 10)}>Visa fler pass</button>}
        </details></>}
  </section>
}
