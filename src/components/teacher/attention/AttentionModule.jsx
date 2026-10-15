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
    <p className="focus-muted">Se mönster över flera dagar. Välj ett färgfält för elevens tidslinje och underlag. Färgerna är preliminära beskrivningar av övningen.</p>
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
    </dl><p>Matrisens färger beskriver träffmönster över flera dagar. Punktdiagrammet visar summerade svar för två mått i vald övning, och tidslinjen visar varje färdigt pass. Avbrutna pass finns i detaljerna. Få signaler ger osäkrare andelar. Slump och ändrat övningsupplägg kan påverka jämförelsen. Resultaten påverkar inte matematiknivåer.</p>
      <details><summary>Preliminära färgregler</summary><p>Vit tills det finns minst tre dagar med tillräckligt underlag och totalt minst 20 svar (12 stoppsignaler för Hejda). En dag behöver minst fyra svar, eller två stoppsignaler. Bara färdiga pass används.</p>
        <p>Grön när dagens träffandel når minst 60 procent under minst två tredjedelar av dessa dagar och medianen av dagarnas andelar också når 60 procent. Annars gul. Blå kräver minst fem dagar och 40 svar, minst 90 procent varje dag och en dagmedian på minst 95 procent.</p>
        <p>En pil kräver sex jämförbara dagar: de tre senaste jämförs med de tre föregående. Pil visas först vid minst 15 procentenheters skillnad i dagmedian och när samtliga senaste dagar ligger på samma sida om samtliga tidigare dagar. Annars visas ingen tydlig riktning. Reglerna är designvärden för provning, inte forskningsfastställda gränser eller statistiska signifikanstest.</p>
      </details></details>
  </section>
}
