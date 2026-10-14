import { useState } from 'react'
import { ATTENTION_LABELS, mergeAttentionHistory } from '../../../lib/attentionHistory'

const ms = value => value === null ? '–' : `${Math.round(value)} ms`
export default function StudentAttentionHistoryPanel({ history }) {
  const [mode, setMode] = useState('all')
  const [limit, setLimit] = useState(10)
  const results = mergeAttentionHistory(history).filter(item => mode === 'all' || item.mode === mode)
  return <section className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Fokusaktiviteter">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-slate-800">Fokusaktiviteter</h3>
      <select aria-label="Filtrera fokusaktiviteter" value={mode} onChange={event => { setMode(event.target.value); setLimit(10) }} className="rounded-lg border px-2 py-1 text-sm">
        <option value="all">Alla aktiviteter</option>{Object.entries(ATTENTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </div>
    <p className="my-2 text-xs text-slate-600">Sparade pass, inklusive avbrutna. Introduktioner ingår inte. Resultaten är observationer från aktiviteterna och påverkar inte matematiknivåer.</p>
    {!results.length && <p className="text-sm text-slate-600">Inga sparade pass i urvalet.</p>}
    <div className="space-y-3">{results.slice(0, limit).map(result => {
      const s = result.summary
      const metrics = result.mode === 'multi'
        ? [['Rätt', s.correct], ['Fel', s.wrong], ['Missade', s.missed], ['Upprepad regel', `${s.repeat.correct}/${s.repeat.total} rätt · ${ms(s.repeat.median)}`], ['Bytt regel', `${s.switch.correct}/${s.switch.total} rätt · ${ms(s.switch.median)}`]]
        : [['Träffar', s.hits], ['Missade signaler', s.misses], ['För tidiga tryck', s.early], ['Tryck på fel signal', s.wrong], ...(result.mode === 'choose' ? [['Rätt avstådda', s.withheld]] : []), ['Medianreaktionstid', ms(s.median)]]
      return <article key={result.id} className="rounded-xl border border-slate-200 bg-white p-3" data-testid="attention-history-row">
        <div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{ATTENTION_LABELS[result.mode]}</strong><span>{result.aborted ? 'Avbrutet' : 'Klart'} · {Math.round(result.activeMs / 1000)} s aktiv tid</span></div>
        <time className="text-xs text-slate-500" dateTime={new Date(result.finishedAt).toISOString()}>{new Date(result.finishedAt).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' })}</time>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">{metrics.map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>)}</dl>
      </article>
    })}</div>
    {results.length > limit && <button type="button" className="mt-3 rounded-lg border px-3 py-2 text-sm" onClick={() => setLimit(value => value + 10)}>Visa fler pass</button>}
    <p className="mt-3 text-xs text-slate-500">De senaste 500 passen per elev behålls. Svarstider gäller rätta svar; – betyder att underlag saknas.</p>
  </section>
}
