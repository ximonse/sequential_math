import { useMemo, useState } from 'react'
import { ATTENTION_LABELS, attentionCompletionLabel } from '../../../lib/attentionHistory'
import { filterAttentionResults, summarizeAttentionResults } from '../../../lib/attentionStatistics'
import AttentionStatisticsOverview from './AttentionStatisticsOverview'
import AttentionPassStatistics from './AttentionPassStatistics'

export default function StudentAttentionHistoryPanel({ history }) {
  const [mode, setMode] = useState('all')
  const [days, setDays] = useState('all')
  const [showAborted, setShowAborted] = useState(true)
  const [limit, setLimit] = useState(10)
  const filtered = useMemo(() => filterAttentionResults(history, { mode, days }), [history, mode, days])
  const groups = useMemo(() => summarizeAttentionResults(filtered), [filtered])
  const results = filtered.filter(result => showAborted || !result.aborted)
  return <section className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Fokusaktiviteter">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-slate-800">Fokusaktiviteter</h3>
      <select aria-label="Filtrera fokusaktiviteter" value={mode} onChange={event => { setMode(event.target.value); setLimit(10) }} className="rounded-lg border px-1.5 py-0.5 text-sm">
        <option value="all">Alla aktiviteter</option>{Object.entries(ATTENTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <select aria-label="Tidsperiod för fokusaktiviteter" value={days} onChange={event => { setDays(event.target.value); setLimit(10) }} className="rounded-lg border px-1.5 py-0.5 text-sm">
        <option value="all">All sparad historik</option><option value="7">Senaste 7 dygnen</option><option value="30">Senaste 30 dygnen</option>
      </select>
    </div>
    <p className="my-2 text-xs text-slate-600">Introduktioner ingår inte. Resultaten är observationer från aktiviteterna och påverkar inte matematiknivåer.</p>
    <AttentionStatisticsOverview groups={groups} />
    <div className="my-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3"><h4 className="text-sm font-semibold text-slate-800">Pass för pass</h4>
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={showAborted} onChange={event => { setShowAborted(event.target.checked); setLimit(10) }} />Visa avbrutna pass</label>
    </div>
    {!results.length && <p className="text-sm text-slate-600">Inga sparade pass i urvalet.</p>}
    <div className="space-y-3">{results.slice(0, limit).map(result => {
      return <article key={result.id} className="rounded-xl border border-slate-200 bg-white p-3" data-testid="attention-history-row">
        <div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{ATTENTION_LABELS[result.mode]}</strong><span>{attentionCompletionLabel(result)} · {Math.round(result.activeMs / 1000)} s aktiv tid</span></div>
        <time className="text-xs text-slate-500" dateTime={new Date(result.finishedAt).toISOString()}>{new Date(result.finishedAt).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' })}</time>
        {result.aborted && <p className="mt-1 text-xs text-amber-800">{result.completionReason === 'no_response' ? 'Inget svar inom fem sekunder · ej fullföljt · ingår inte i översikten' : 'Kortare pass · ingår inte i översikten'}</p>}
        {result.mode === 'discover' && result.version === 1 && <p className="mt-1 text-xs text-slate-600">Äldre upplägg (2 s) · bara historik, inte ny jämförelse</p>}
        <AttentionPassStatistics result={result} />
      </article>
    })}</div>
    {results.length > limit && <button type="button" className="mt-3 rounded-lg border px-1.5 py-0.5 text-sm" onClick={() => setLimit(value => value + 10)}>Visa fler pass</button>}
    <details className="mt-4 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Så läser du måtten</summary>
      <div className="mt-2 space-y-2">
        <p><strong>Gröna signaler:</strong> träffar av alla gröna cirklar. <strong>Stopp:</strong> rätt avstådda röda cirklar och gröna fyrkanter. För tidiga tryck räknas separat per aktiv minut.</p>
        <p><strong>MULTI:</strong> rätta svar av alla färdiga uppgifter, inklusive fel och missade. Upprepad och bytt regel jämförs efter föregående uppgift; första uppgiften ingår bara i passets totala resultat.</p>
        <p><strong>Svarstid:</strong> median för rätta svar i samma pass. Passmedianer slås inte ihop till en gemensam median. Jämför både träffsäkerhet och tid och kontrollera hur många svar måttet bygger på.</p>
      </div>
    </details>
    <p className="mt-3 text-xs text-slate-500">De senaste 500 passen per elev behålls. Svarstider gäller rätta svar; – betyder att underlag saknas. Titta på antal svar när du jämför procent. Olika aktiviteter ska inte jämföras som ett gemensamt fokusbetyg.</p>
  </section>
}
