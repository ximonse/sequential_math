import { useMemo, useState } from 'react'
import { ATTENTION_LABELS } from '../../../lib/attentionHistory'
import useAttentionCohort from './useAttentionCohort'
import { buildAttentionReference } from './attentionReference'
import { buildAttentionGroup } from './attentionGroup'
import AttentionMatrix from './AttentionMatrix'
import AttentionPlot from './AttentionPlot'
import AttentionIndividual from './AttentionIndividual'
import AttentionForm, { AttentionWeek } from './AttentionForm'
import AttentionExport from './AttentionExport'
import './attentionModule.css'

export default function AttentionModule({ students = [], allStudents = students }) {
  const [days, setDays] = useState('all')
  const [mode, setMode] = useState('choose')
  const [view, setView] = useState('matrix')
  const [selectedId, setSelectedId] = useState('')
  const [linkedPassId, setLinkedPassId] = useState('')
  const { records, roster, ready, asOf, refresh } = useAttentionCohort(allStudents)
  const rows = useMemo(() => buildAttentionGroup(students, records, { days, now: asOf || Date.now() }), [students, records, days, asOf])
  const referenceRows = useMemo(() => buildAttentionGroup(roster, records, { days, now: asOf || Date.now() }), [roster, records, days, asOf])
  const archiveRows = useMemo(() => buildAttentionGroup(roster, records, { now: asOf || Date.now() }), [roster, records, asOf])
  const selectedArchiveRows = archiveRows.filter(row => students.some(student => student.studentId === row.studentId))
  const reference = useMemo(() => ready ? buildAttentionReference(referenceRows) : null, [ready, referenceRows])
  const selected = rows.find(row => row.studentId === selectedId)
  const loaded = rows.filter(row => row.status === 'ready').length
  const errors = rows.filter(row => row.status === 'error').length
  const loading = rows.some(row => row.status === 'loading') || referenceRows.some(row => row.status === 'loading')
  const select = (id, nextMode) => { setSelectedId(id); if (nextMode) setMode(nextMode) }
  return <section className="focus-module" aria-label="Fokusövningar">
    <header className="focus-section-heading"><div><p className="focus-eyebrow">Grupp → individ → pass</p><h2>Fokusövningar</h2>
      <p className="focus-muted">Vänta, upptäcka, hejda ett tryck och växla regel.</p></div>
      <button type="button" className="focus-action" disabled={loading} onClick={refresh}>Uppdatera fokusresultat</button></header>
    <div className="focus-toolbar"><div className="focus-view-picker" role="group" aria-label="Visualisering">
      <button type="button" aria-pressed={view === 'matrix'} onClick={() => setView('matrix')}>Matris</button>
      <button type="button" aria-pressed={view === 'plot'} onClick={() => setView('plot')}>Punktdiagram</button></div>
      <button type="button" className="focus-action" aria-pressed={view === 'form'} onClick={() => setView('form')}>Dagsform</button>
      <button type="button" className="focus-action" aria-pressed={view === 'week'} onClick={() => setView('week')}>Veckomönster</button>
      <label>Övning för diagram och individ<select value={mode} aria-label="Övning för fokusdiagram" onChange={event => setMode(event.target.value)}>
        {Object.entries(ATTENTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>Period för historik<select aria-label="Period för fokusgruppen" value={days} onChange={event => setDays(event.target.value)}>
        <option value="all">All sparad historik</option><option value="7">Senaste 7 dygnen</option><option value="30">Senaste 30 dygnen</option>
      </select></label></div>
    <p className="focus-load-status" role="status">{loaded} av {rows.length} elever hämtade{loading ? ' · hämtar…' : ''}{errors ? ` · ${errors} kunde inte hämtas. Försök uppdatera.` : ''}</p>
    {['matrix', 'plot'].includes(view) && <><p className="focus-muted">Se mönster över flera dagar. Välj ett färgfält för elevens tidslinje och underlag. Färgerna är preliminära beskrivningar av övningen.</p>
    <p className="focus-muted" data-testid="focus-reference-status">Preliminär lokal jämförelse · hela ditt tillgängliga elevunderlag ({roster.length} elever). {ready
      ? `Underlaget läst ${new Date(asOf).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm', dateStyle: 'short', timeStyle: 'short' })}. Gruppval ändrar inte referensen. Uppdatera fokusresultat hämtar ett nytt underlag.`
      : 'Jämförelsen är avstängd tills hela underlaget har hämtats utan fel. Beskrivande färger kan visas under tiden.'}</p></>}
    {!rows.length ? <p className="focus-empty">Inga elever i klass-/gruppurvalet. Välj en grupp ovan.</p>
      : view === 'matrix' ? <AttentionMatrix rows={rows} selectedId={selectedId} onSelect={select} reference={reference} />
        : view === 'plot' ? <AttentionPlot rows={rows} mode={mode} selectedId={selectedId} onSelect={select} />
          : view === 'form' ? <AttentionForm rows={selectedArchiveRows} referenceRows={ready ? archiveRows : []} mode={mode} asOf={asOf || Date.now()} onSelect={select} />
            : selected ? <AttentionWeek row={selected} referenceRows={ready ? archiveRows : []} mode={mode} asOf={asOf || Date.now()} onPass={pass => setLinkedPassId(pass.id)} /> : <p className="focus-empty">Välj en elev för veckomönstret.</p>}
    <div className="focus-student-picker"><label>Följ en elev<select aria-label="Elev i fokusmodulen" value={selected?.studentId || ''} onChange={event => setSelectedId(event.target.value)}>
      <option value="">Välj elev</option>{rows.map(row => <option key={row.studentId} value={row.studentId}>{row.name}</option>)}
    </select></label></div>
    {selected ? <AttentionIndividual key={`${selected.studentId}-${mode}-${days}-${linkedPassId}`} initialPassId={linkedPassId} row={selected} mode={mode} reference={reference} /> : <p className="focus-empty">Välj en elev i matrisen eller listan för att följa passen över tid.</p>}
    <AttentionExport rows={selectedArchiveRows} asOf={asOf || Date.now()} />
    <details className="focus-explanation"><summary>Vad visar övningarna och diagrammen?</summary><dl>
      <dt>1 - FOKUS · fullföljande och svarstid</dt><dd>Fem sekunder utan svar på grönt erbjuder omstart och sparar försöket som ej fullföljt. Färgen använder svarstid från fullföljda pass över flera dagar. Utveckling under passet visar när svaren blir långsammare eller uteblir. Äldre tvåsekunderspass visas bara i historiken.</dd>
      <dt>2 - KONTROLL · upptäcka och avstå</dt><dd>Träffar på gröna cirklar och rätt avstådda röda cirklar/gröna fyrkanter redovisas separat.</dd>
      <dt>MULTI · växla regel</dt><dd>Rätt vid upprepad respektive bytt regel. Första uppgiften saknar föregående regel och ingår bara i totalen.</dd>
    </dl><p>Matrisens färger beskriver svarstid i FOKUS och träffmönster i KONTROLL/MULTI över flera dagar. FOKUS-punktdiagrammet visar senaste fullföljda passet; övriga punktdiagram använder summerade svar. Tidslinjen visar färdiga pass, och Utveckling under passet visar varje signals tid och utfall. Avbrutna pass finns i detaljerna. Få signaler ger osäkrare andelar. Slump och ändrat övningsupplägg kan påverka jämförelsen. Resultaten påverkar inte matematiknivåer.</p>
      <details><summary>Preliminära färgregler</summary><p>FOKUS använder senaste fullföljda pass med minst fyra träffar per dag: grönt efter tre dagar/20 svar, gult vid dagmedian minst 1 sekund, blått efter fem dagar/40 svar och under 600 ms varje dag. Orange kräver minst 1 sekund, minst 500 ms och 1,5 standardavvikelser över minst åtta andra elevers genomsnitt på minst 80 procent av senaste fem dagarna. Rött kräver minst 1,5 sekunder, 750 ms och två standardavvikelser över genomsnittet alla fem dagarna, med minst 40 svar. Ej fullföljt visas separat. Följande träffregler gäller KONTROLL och MULTI: vit tills det finns minst tre dagar med tillräckligt underlag och totalt minst 20 svar (12 stoppsignaler för Hejda). En dag behöver minst fyra svar, eller två stoppsignaler. Bara färdiga pass används.</p>
        <p>Grön när dagens träffandel når minst 60 procent under minst två tredjedelar av dessa dagar och medianen av dagarnas andelar också når 60 procent. Annars gul. Blå kräver minst fem dagar och 40 svar, minst 90 procent varje dag och en dagmedian på minst 95 procent.</p>
        <p>En pil kräver sex jämförbara dagar: de tre senaste jämförs med de tre föregående. Pil visas först vid minst 15 procentenheters skillnad i dagmedian och när samtliga senaste dagar ligger på samma sida om samtliga tidigare dagar. Annars visas ingen tydlig riktning. Reglerna är designvärden för provning, inte forskningsfastställda gränser eller statistiska signifikanstest.</p>
        <p>Lokal jämförelse kräver minst åtta andra elever med minst tre dagar och tillräckligt antal svar i samma moment och period. Varje elev väger lika med medianen av sina senaste upp till fem dagar. Den aktuella eleven räknas bort från referensen.</p>
        <p>I KONTROLL/MULTI kräver orange minst 20 procentenheter och 1,5 standardavvikelser under de andra elevernas genomsnitt, både för elevens dagmedian och minst 80 procent av de senaste upp till fem dagarna. Rött kräver minst 30 procentenheter och två standardavvikelser under genomsnittet under samtliga fem senaste jämförbara dagar, med minst 40 svar. Referensen saknar åldersmatchning; äldre FOKUS-protokoll undantas; färgerna är preliminära uppföljningssignaler, inte säkra mått på koncentrationsförmåga.</p>
      </details></details>
  </section>
}
