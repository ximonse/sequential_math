import { useRef, useState } from 'react'
import QuestionText from '../../QuestionText.jsx'
import DiagnosticAttemptHistory from './DiagnosticAttemptHistory.jsx'
import ContrastFollowUp from './ContrastFollowUp.jsx'
import { contrastFollowUpEligible } from '../../../lib/practiceModes.js'
import { diagnosticRequest } from './diagnosticRequest.js'
import { OPERATION_LABELS } from '../../../lib/operations.js'
import '../../../dev/diagnosticGridPrototype.css'

const originLabels = { rule: 'Regelbaserat granskningsunderlag', ai: 'AI-formulerad tolkning – behöver lärargranskning', teacher: 'Lärarformulerad tolkning' }
export default function PupilAnalysisReportView({ report, baseUrl, studentId, classId }) {
  const [selected, setSelected] = useState(null)
  const [original, setOriginal] = useState(null)
  const [message, setMessage] = useState('')
  const activeRef = useRef(null)
  const references = (refs, label) => <details className="mt-2 text-sm"><summary>{label} ({refs.length})</summary>
    {refs.map((ref, index) => {
      const entry = report.evidence.find(e => e.ref === ref)
      return <button key={ref} type="button" className="mr-3 mt-1 rounded border px-2 py-1 underline" onClick={() => { activeRef.current = ref; setSelected(entry); setOriginal(null); setMessage('') }}>
        Visa svar {index + 1}: {entry?.question.promptText || entry?.question.promptSv || OPERATION_LABELS[entry?.question.operation] || 'uppgift'}
      </button>
    })}
  </details>
  return <section aria-label="Analysrapport" className="mt-3 text-slate-900">
    <p className="text-sm font-semibold">{originLabels[report.provenance.kind]}</p>
    <h4 className="mt-1 font-semibold">{report.scopeSv}</h4>
    <p className="text-sm">{report.period.from}–{report.period.to} · {report.source === 'practice' ? 'Träning' : report.source === 'screening' ? 'Screening' : 'Träning och screening'} · {report.counts.total} svar: {report.counts.correct} rätt, {report.counts.incorrect} fel. Övriga: {report.counts.total - report.counts.correct - report.counts.incorrect}.</p>
    <p className="mt-2 text-sm">Underlaget är ett urval. Historikens fullständighet är okänd. Antal och referenser är kontrollerade; tolkningens rimlighet behöver granskas.</p>
    {references(report.exampleRefs || [], 'Svar från periodens början, högst 20')}
    <h5 className="mt-3 font-semibold">Det som fungerar i urvalet</h5>
    {report.strengths.length ? report.strengths.map(item => <div key={item.id} className="mt-2"><p>{item.textSv}</p>{references(item.refs, 'Rätta svar')}</div>) : <p className="text-sm">Inga sådana exempel valda. Det betyder inte att eleven saknar kunnande.</p>}
    <h5 className="mt-3 font-semibold">Möjliga felmönster att undersöka</h5>
    {!report.hypotheses.length && <p className="text-sm">Otillräckligt underlag för en felhypotes i detta granskningsunderlag.</p>}
    {report.hypotheses.map(item => <div key={item.id} className="mt-3 border-l-2 border-amber-400 pl-3">
      <p className="text-sm font-semibold">{item.basis === 'rule_candidate' ? 'Beräknad felmodell' : item.basis === 'existing_signal' ? 'Befintlig analyssignal' : 'Tolkning'} · {item.evidenceStatus === 'insufficient' ? 'Otillräckligt underlag' : 'Behöver lärargranskning'}</p>
      <p>{item.textSv}</p>{references(item.supportRefs, 'Stödsvar')}{references(item.counterRefs, 'Valda motexempel')}
      {!item.counterRefs.length && <p className="text-sm mt-1">Inga motexempel valda; det innebär inte att motexempel saknas.</p>}
      <p className="mt-2 text-sm font-semibold">Alternativa förklaringar</p><ul className="list-disc pl-5 text-sm">{item.alternativesSv.map((value, i) => <li key={i}>{value}</li>)}</ul>
      <p className="mt-2 text-sm"><strong>Att undersöka:</strong> {item.nextCheckSv}</p>
      {studentId && contrastFollowUpEligible(item, report) && <ContrastFollowUp item={item} report={report} studentId={studentId} classId={classId} />}
    </div>)}
    <details className="mt-3 text-sm"><summary>Begränsningar och källrevision</summary>
      {report.limitationsSv.map((value, i) => <p key={i} className="mt-1">{value}</p>)}
      <p className="break-all mt-2">Källrevision: {report.snapshotRevision}</p>
      <p>Instruktionsversion: {report.provenance.instructionVersion}{report.provenance.model ? ` · Modell: ${report.provenance.model}` : ''}</p>
    </details>
    {selected && <section className="mt-3 rounded border border-slate-300 p-3" aria-label="Rapportens källsvar">
      <QuestionText>{selected.question.promptText || selected.question.promptSv || 'Frågetext saknas i den sparade historiken.'}</QuestionText>
      {!selected.question.promptText && !selected.question.promptSv && <p className="text-sm">Område: {OPERATION_LABELS[selected.question.operation] || 'okänt'}. Sparade tal i underlaget: {Object.values(selected.question.values || {}).filter(value => typeof value === 'number').join(', ') || 'saknas'}.</p>}
      <p>Elevens svar: {String(selected.answer.studentAnswer ?? 'saknas')} · Facit: {String(selected.answer.correctAnswer ?? 'manuell bedömning')}</p>
      <p className="text-sm">{new Date(selected.timestamp).toLocaleString('sv-SE')} · {selected.source === 'practice' ? 'Träning' : 'Screening'} · {selected.interpretation.detail || 'Ingen säker felorsak fastställd.'}</p>
      {selected.source === 'screening' && <button type="button" className="mt-2 rounded border px-2 py-1 text-sm" onClick={async () => {
        setMessage('Hämtar originalet…')
        try {
          const params = new URLSearchParams({ resource: 'evidence', source: report.source, from: report.period.from, to: report.period.to,
            ref: selected.ref, snapshotRevision: report.snapshotRevision })
          const response = await diagnosticRequest(`${baseUrl}&${params}`)
          if (activeRef.current !== selected.ref) return
          if (!response.ok) throw new Error(response.status === 409 ? 'Källan har ändrats sedan rapporten sparades. Rapportens sparade svar är kvar; hämta ett nytt underlag för aktuellt räknehäfte.' : response.data.error)
          setOriginal(response.data.entry); setMessage('Originalet är hämtat utan ändringar.')
        } catch (error) { if (activeRef.current === selected.ref) setMessage(error.message || 'Originalet kunde inte hämtas.') }
      }}>Visa sparat räknehäfte</button>}
      {message && <p role="status" className="text-sm mt-2">{message}</p>}
      {original?.ref === selected.ref && original.detail && <DiagnosticAttemptHistory snapshot={original.detail.snapshot} task={original.question}
        imageContext={{ teacher: true, assignmentId: original.reference.assignmentId, classId: original.context.classIdAtAttempt }} />}
    </section>}
  </section>
}
