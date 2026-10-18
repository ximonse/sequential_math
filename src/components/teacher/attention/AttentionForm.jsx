import { useState } from 'react'
import { FORM_METRICS, attentionComparison, latestToday, focusDate } from '../../../lib/attentionForm'
import { attentionCompletionLabel } from '../../../lib/attentionHistory'

const FORM_COLORS = { white: '#ffffff', red: '#c95961', orange: '#ce873e', yellow: '#c6ae38', green: '#548b68', blue: '#4c79a2' }
const dimensions = [['speed', 'discover'], ['endurance', 'discover'], ['control', 'choose'], ['switching', 'multi']]
const dateTime = timestamp => new Date(timestamp).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' })
const clamp = value => Math.max(-3, Math.min(3, value))
const classes = row => row.classIds || []
const peersFor = (row, rows) => classes(row).length ? rows.filter(peer => classes(peer).some(id => classes(row).includes(id))) : []

export default function AttentionForm({ rows, referenceRows = rows, asOf, mode, onSelect }) {
  const [baseline, setBaseline] = useState('class'), [display, setDisplay] = useState('matrix')
  const [vertical, setVertical] = useState('endurance')
  const compare = (row, pass, metric) => attentionComparison(row, pass, metric, peersFor(row, referenceRows), baseline, asOf)
  const yMetric = mode === 'discover' ? 'endurance' : vertical === 'endurance' ? 'endurance' : mode === 'choose' ? 'control' : 'switching'
  const points = rows.flatMap(row => {
    const pass = latestToday(row, mode, asOf)
    if (!pass) return []
    const x = compare(row, pass, 'speed'), y = compare(row, pass, yMetric)
    return x.score === null || y.score === null ? [] : [{ row, pass, x, y }]
  })
  return <section aria-label="Dagsform för klassen">
    <div className="focus-toolbar"><label>Jämför med<select aria-label="Referens för dagsform" value={baseline} onChange={e => setBaseline(e.target.value)}><option value="class">Klasskamrater · föregående 3 veckor</option><option value="own">Eleven själv · föregående 3 veckor</option></select></label>
      <div className="focus-view-picker" role="group" aria-label="Dagsformens visning"><button aria-pressed={display === 'matrix'} onClick={() => setDisplay('matrix')}>Nivåmatris</button><button aria-pressed={display === 'plot'} onClick={() => setDisplay('plot')}>Fyrfältare</button></div>
      {display === 'plot' && mode !== 'discover' && <label>Vertikal axel<select aria-label="Fyrfältarens vertikala axel" value={vertical} onChange={e => setVertical(e.target.value)}><option value="endurance">Uthållighet</option><option value="task">{mode === 'choose' ? 'Kontroll' : 'Regelväxling'}</option></select></label>}
    </div>
    <p className="focus-muted">Dagsform: {focusDate(asOf)} · senaste försöket per övning. Referensen slutar före idag och hålls fast tills du uppdaterar. {baseline === 'class' ? 'Samma klass, eleven själv undantagen. Minst åtta kamrater med tre mätdagar; varje elev väger lika.' : 'Minst tre tidigare mätdagar; varje dag väger lika.'} Endast samma aktivitetsprotokoll jämförs.</p>
    {display === 'matrix' ? <div className="focus-table-scroll"><table className="focus-matrix focus-form-matrix"><thead><tr><th>Elev</th>{dimensions.map(([metric, exercise]) => <th key={metric}>{FORM_METRICS[metric]}<span className="focus-column-exercise">{exercise === 'discover' ? 'FOKUS' : exercise === 'choose' ? 'KONTROLL' : 'MULTI'}</span></th>)}</tr></thead><tbody>
      {rows.map(row => <tr key={row.studentId}><th scope="row"><button className="focus-pupil-button" onClick={() => onSelect(row.studentId)}>{row.name}</button></th>{dimensions.map(([metric, exercise]) => {
        const pass = latestToday(row, exercise, asOf), result = pass ? compare(row, pass, metric) : null
        const label = row.status !== 'ready' ? 'Underlaget är inte hämtat' : !pass ? 'Inget pass idag' : pass.aborted ? attentionCompletionLabel(pass) : result.label
        return <td key={metric}><button className="focus-form-cell" aria-label={`${row.name}, ${FORM_METRICS[metric]}, ${label}`} onClick={() => onSelect(row.studentId, exercise)} title={pass ? `${dateTime(pass.startedAt)} · ${label}` : label}>
          <i className="focus-form-dot" style={{ background: FORM_COLORS[result?.color || 'white'] }} aria-hidden="true" /><span>{label}</span>
        </button></td>
      })}</tr>)}
    </tbody></table></div> : <>
      <svg viewBox="0 0 680 330" className="focus-chart" role="img" aria-label={`Dagsform: svarshastighet och ${FORM_METRICS[yMetric].toLowerCase()}`}>
        <title>Varje liten punkt är en elevs senaste jämförbara pass idag</title>
        <rect x="70" y="25" width="570" height="250" fill="#f6f9f7" stroke="#d7e3e0" />
        <path d="M355 25V275 M70 150H640" stroke="#9cb8b0" strokeDasharray="3 4" />
        <text x="76" y="42">Långsammare · starkare {FORM_METRICS[yMetric].toLowerCase()}</text><text x="370" y="42">Snabbare · starkare</text>
        <text x="76" y="266">Långsammare · svagare</text><text x="370" y="266">Snabbare · svagare</text>
        {points.map(({ row, pass, x, y }, i) => <g key={row.studentId} role="button" tabIndex="0" aria-label={`${row.name}, ${dateTime(pass.startedAt)}, visa pass`}
          onClick={() => onSelect(row.studentId, mode)} onKeyDown={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); onSelect(row.studentId, mode) } }}>
          <circle cx={355 + clamp(x.score) * 88 + ((i % Math.ceil(Math.sqrt(points.length))) - (Math.ceil(Math.sqrt(points.length)) - 1) / 2) * 9}
            cy={150 - clamp(y.score) * 36 + (Math.floor(i / Math.ceil(Math.sqrt(points.length))) - (Math.ceil(Math.sqrt(points.length)) - 1) / 2) * 9}
            r="3.5" fill={FORM_COLORS[y.color]} stroke="#193d40" strokeWidth=".5" />
          <title>{row.name} · {dateTime(pass.startedAt)} · {x.label} / {y.label}</title>
        </g>)}
        <text x="355" y="310" textAnchor="middle">Svarshastighet →</text><text x="15" y="160" transform="rotate(-90 15 160)" textAnchor="middle">{FORM_METRICS[yMetric]} →</text>
      </svg><p className="focus-muted">{points.length} av {rows.length} elever kan placeras. Övriga saknar jämförbart underlag idag och finns kvar i nivåmatrisen. Punkterna kan väljas med tangentbord. Små förskjutningar skiljer överlappande punkter; inga exakta rangordningar.</p>
    </>}
    <p className="focus-muted">Vit: otillräckligt underlag. Grön: vanlig variation. Gul: lägre i detta pass. Blå: starkare i detta pass. Orange/röd kräver stora skillnader som återkommit under minst fyra/fem tidigare mätdagar; under genomsnittet räcker inte. Ingen åldersnorm finns.</p>
  </section>
}

export function AttentionWeek({ row, referenceRows, mode, asOf, onPass }) {
  const [metric, setMetric] = useState('speed'), [baseline, setBaseline] = useState('own'), [selected, setSelected] = useState('')
  const allowed = ['speed', 'endurance', ...(mode === 'choose' ? ['control'] : mode === 'multi' ? ['switching'] : [])]
  const currentMetric = allowed.includes(metric) ? metric : 'speed'
  const passes = row.history.filter(pass => pass.mode === mode && pass.startedAt <= asOf)
  const selectedPass = passes.find(pass => pass.id === selected)
  const format = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const days = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön']
  return <section aria-label="Elevens veckomönster"><div className="focus-toolbar">
    <label>Mått i veckoschemat<select aria-label="Mått i veckoschemat" value={currentMetric} onChange={e => setMetric(e.target.value)}>{allowed.map(id => <option key={id} value={id}>{FORM_METRICS[id]}</option>)}</select></label>
    <label>Jämför med<select aria-label="Referens för veckoschemat" value={baseline} onChange={e => setBaseline(e.target.value)}><option value="own">Eleven själv · föregående 3 veckor</option><option value="class">Klasskamrater · föregående 3 veckor</option></select></label>
  </div><p className="focus-muted">Alla veckor i urvalet läggs ovanpå varandra. Varje punkt är ett försök, placerat efter svensk veckodag, timme och minut. Vitt är okänt; en tom ruta betyder inget pass. Varje pass jämförs med de tre veckorna före sin egen dag.</p>
    <svg viewBox="0 0 680 480" className="focus-week-chart" role="img" aria-label="Veckoschema med samtliga 24 timmar">
      {days.map((day, i) => <text key={day} x={98 + i * 80} y="17" textAnchor="middle">{day}</text>)}
      {Array.from({ length: 24 }, (_, hour) => <g key={hour}><text x="40" y={40 + hour * 18} textAnchor="end">{String(hour).padStart(2, '0')}</text><line x1="58" x2="618" y1={26 + hour * 18} y2={26 + hour * 18} stroke="#d7e3e0" /></g>)}
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1={58 + i * 80} x2={58 + i * 80} y1="26" y2="458" stroke="#d7e3e0" />)}
      {passes.map((pass, index) => {
        const parts = Object.fromEntries(format.formatToParts(pass.startedAt).map(p => [p.type, p.value]))
        const day = days.indexOf(parts.weekday.replace('.', '')), hour = Number(parts.hour), minute = Number(parts.minute)
        const result = attentionComparison(row, pass, currentMetric, peersFor(row, referenceRows), baseline, pass.startedAt)
        const label = `${dateTime(pass.startedAt)} · ${attentionCompletionLabel(pass)} · ${result.label}`
        return day < 0 ? null : <g key={pass.id} tabIndex="0" role="button" aria-label={label} onClick={() => { setSelected(pass.id); onPass?.(pass) }} onKeyDown={e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); setSelected(pass.id); onPass?.(pass) } }}>
          <circle cx={98 + day * 80 + ((index % 11) - 5) * 4} cy={26 + (hour + minute / 60) * 18} r="3" fill={FORM_COLORS[result.color]} stroke="#536b68" strokeWidth=".6" /><title>{label}</title>
        </g>
      })}
    </svg><p role="status" className="focus-muted">{selectedPass ? `${dateTime(selectedPass.startedAt)} · ${attentionCompletionLabel(selectedPass)}` : `${passes.length} försök. Välj en punkt för datum och klockslag.`}</p>
  </section>
}
