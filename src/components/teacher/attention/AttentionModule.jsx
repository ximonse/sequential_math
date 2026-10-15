import { useMemo, useState } from 'react'
import { ATTENTION_LABELS } from '../../../lib/attentionHistory'
import useAttentionGroup from './useAttentionGroup'
import { buildAttentionGroup } from './attentionGroup'
import AttentionMatrix from './AttentionMatrix'
import AttentionPlot from './AttentionPlot'
import AttentionIndividual from './AttentionIndividual'
import './attentionModule.css'

export default function AttentionModule({ students = [] }) {
  const [days, setDays] = useState('all')
  const [mode, setMode] = useState('choose')
  const [view, setView] = useState('matrix')
  const [selectedId, setSelectedId] = useState('')
  const { records, refresh } = useAttentionGroup(students)
  const rows = useMemo(() => buildAttentionGroup(students, records, { days }), [students, records, days])
  const selected = rows.find(row => row.studentId === selectedId)
  const loaded = rows.filter(row => row.status === 'ready').length
  const errors = rows.filter(row => row.status === 'error').length
  const loading = rows.some(row => row.status === 'loading')
  const select = (id, nextMode) => { setSelectedId(id); if (nextMode) setMode(nextMode) }
  return <section className="focus-module" aria-label="Fokusövningar">
    <header className="focus-section-heading"><div><p className="focus-eyebrow">Grupp → individ → pass</p><h2>Fokusövningar</h2>
      <p className="focus-muted">Vänta, upptäcka, hejda ett tryck och växla regel.</p></div>
      <button type="button" className="focus-action" disabled={loading} onClick={refresh}>Uppdatera fokusresultat</button></header>
    <div className="focus-toolbar"><div className="focus-view-picker" role="group" aria-label="Visualisering">
      <button type="button" aria-pressed={view === 'matrix'} onClick={() => setView('matrix')}>Matris</button>
      <button type="button" aria-pressed={view === 'plot'} onClick={() => setView('plot')}>Punktdiagram</button></div>
      <label>Övning för diagram och individ<select value={mode} aria-label="Övning för fokusdiagram" onChange={event => setMode(event.target.value)}>
        {Object.entries(ATTENTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>Period<select aria-label="Period för fokusgruppen" value={days} onChange={event => setDays(event.target.value)}>
        <option value="all">All sparad historik</option><option value="7">Senaste 7 dygnen</option><option value="30">Senaste 30 dygnen</option>
      </select></label></div>
    <p className="focus-load-status" role="status">{loaded} av {rows.length} elever hämtade{loading ? ' · hämtar…' : ''}{errors ? ` · ${errors} kunde inte hämtas. Försök uppdatera.` : ''}</p>
    <p className="focus-muted">Färdiga tvåminuterspass sammanställs med antal svar som underlag. Inga normer eller fokusbetyg. Saknat underlag visas som –.</p>
    {!rows.length ? <p className="focus-empty">Inga elever i klass-/gruppurvalet. Välj en grupp ovan.</p>
      : view === 'matrix' ? <AttentionMatrix rows={rows} selectedId={selectedId} onSelect={select} />
        : <AttentionPlot rows={rows} mode={mode} selectedId={selectedId} onSelect={select} />}
    <div className="focus-student-picker"><label>Följ en elev<select aria-label="Elev i fokusmodulen" value={selected?.studentId || ''} onChange={event => setSelectedId(event.target.value)}>
      <option value="">Välj elev</option>{rows.map(row => <option key={row.studentId} value={row.studentId}>{row.name}</option>)}
    </select></label></div>
    {selected ? <AttentionIndividual key={`${selected.studentId}-${mode}-${days}`} row={selected} mode={mode} /> : <p className="focus-empty">Välj en elev i matrisen eller listan för att följa passen över tid.</p>}
    <details className="focus-explanation"><summary>Vad visar övningarna och diagrammen?</summary><dl>
      <dt>1 - FOKUS · upptäcka</dt><dd>Träffar av gröna signaler och för tidiga tryck per aktiv minut.</dd>
      <dt>2 - KONTROLL · upptäcka och avstå</dt><dd>Träffar på gröna cirklar och rätt avstådda röda cirklar/gröna fyrkanter redovisas separat.</dd>
      <dt>MULTI · växla regel</dt><dd>Rätt vid upprepad respektive bytt regel. Första uppgiften saknar föregående regel och ingår bara i totalen.</dd>
    </dl><p>Matrisen sammanställer täljare och nämnare från färdiga pass. Punktdiagrammet visar samma underlag för två mått i vald övning. Tidslinjen visar varje färdigt pass. Avbrutna pass finns i detaljerna. Få signaler ger osäkrare andelar. Slump och ändrat övningsupplägg kan påverka jämförelsen. Resultaten påverkar inte matematiknivåer.</p></details>
  </section>
}
