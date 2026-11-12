import { useRef, useState } from 'react'
import QuestionText from '../../QuestionText.jsx'
import DiagnosticAttemptHistory from './DiagnosticAttemptHistory.jsx'
import ContrastFollowUp from './ContrastFollowUp.jsx'
import MultiContrastFollowUp from './MultiContrastFollowUp.jsx'
import { isSimpleFactItem } from '../../../lib/repeatCheck.js'
import { didacticPackage } from '../../../lib/didacticFollowUp.js'
import { slipExclusionKey } from '../../../lib/slipExclusionKey.js'
import { teacherAssessedNote } from '../../../lib/evidenceTeacherAssessment.js'
import ReportReviewNote from '../ReportReviewNote.jsx'
import WorkEvidenceNote from '../WorkEvidenceNote.jsx'
import { contrastFollowUpEligible } from '../../../lib/practiceModes.js'
import { diagnosticRequest } from './diagnosticRequest.js'
import { OPERATION_LABELS } from '../../../lib/operations.js'
import { CONTRAST_LABELS_SV } from '../../../domains/predictableErrors/contrast.js'
import { NOT_METHOD_MODELS } from '../../../domains/predictableErrors/catalog.js'
import { meetsPattern } from '../../../lib/modelPattern.js'
import { modelDescription } from '../../../domains/predictableErrors/modelDescriptions.js'
import '../../../dev/diagnosticGridPrototype.css'

const originLabels = { rule: 'Regelbaserad analys', ai: 'AI-formulerad tolkning – behöver lärargranskning', teacher: 'Lärarformulerad tolkning' }
const SYMBOLS = { addition: '+', subtraction: '−', multiplication: '·', division: '/' }

const questionText = entry => entry?.question.promptText || entry?.question.promptSv || (() => {
  const { a, b } = entry?.question.values || {}
  const symbol = SYMBOLS[entry?.question.operation]
  return symbol && a !== undefined && b !== undefined ? `${a} ${symbol} ${b}` : OPERATION_LABELS[entry?.question.operation] || 'uppgift'
})()
const titleFor = item => (item.signalCode && CONTRAST_LABELS_SV[item.signalCode])
  || (item.basis === 'existing_signal' ? 'Tidigare felmarkering' : String(item.textSv).split('. ')[0])
const SCOPE_LABELS = { addition: 'addition', subtraction: 'subtraktion', multiplication: 'multiplikation', division: 'division',
  decimal_addition: 'decimaladdition', decimal_subtraction: 'decimalsubtraktion' }
// One edge colour per area, with the area name beside the title for those who cannot rely on colour.
const AREAS = {
  addition: ['Addition', '#1d4ed8'], subtraction: ['Subtraktion', '#be185d'], multiplication: ['Multiplikation', '#6d28d9'],
  division: ['Division', '#0f766e'], fractions: ['Bråk', '#c2410c'], percentage: ['Procent', '#a16207'],
  algebra: ['Algebra', '#15803d'], arithmetic_expressions: ['Uttryck', '#475569'], number_fluency: ['Talflyt', '#0e7490']
}
function areaOf(entry) {
  const result = entry?.interpretation.predictable, scope = String(result?.scope || '')
  const key = result?.domain && result.domain !== 'arithmetic' ? result.domain
    : scope.replace(/^decimal_/u, '') || entry?.question.operation
  const [label, color] = AREAS[key] || ['Övrigt', '#64748b']
  return { label: scope.startsWith('decimal_') ? `${label} med decimaltal` : label, color }
}
// The caveat stands once at the top of the report, not in every card.
const withoutCaveat = text => String(text).replace(/\s*Det är en beräknad kandidat, inte en fastställd elevmetod\.?/u, '').trim()
const shortDate = timestamp => timestamp ? new Date(timestamp).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }) : ''

export default function PupilAnalysisReportView({ report, savedItem, baseUrl, studentId, classId, onHideSlip, canCreateScreening = true }) {
  const [selected, setSelected] = useState(null)
  const [original, setOriginal] = useState(null)
  const [message, setMessage] = useState('')
  const [chosen, setChosen] = useState(() => new Set())
  const activeRef = useRef(null)
  const byRef = new Map(report.evidence.map(entry => [entry.ref, entry]))
  const reviewFor = item => {
    if (!savedItem) return null
    const check = savedItem.checkIns.at(-1), decision = check?.decisions.find(value => value.hypothesisId === item.id)
    return { studentId, reportId: savedItem.id, reportVersion: savedItem.version, hypothesisId: item.id,
      checkInRevision: check?.revision ?? 0, decision: decision?.decision ?? 'undecided',
      interpretationSv: decision?.interpretationSv ?? '', goalSv: check?.goalSv ?? '' }
  }
  // Slips, input and answers that do not yet form a pattern across different tasks.
  const slip = item => NOT_METHOD_MODELS.has(item.signalCode)
    || !meetsPattern(item.signalCode, item.supportRefs.map(ref => byRef.get(ref)).filter(Boolean))
  const suspicions = report.hypotheses.filter(item => !slip(item))
  // Suspicions that can share one screening: computed, outside the didactic
  // packages, and not revised or rejected by the teacher.
  const [askAgain, setAskAgain] = useState('')
  // Simple facts (tables, small sums) are asked again; other suspicions need reviewed contrast questions.
  const simple = item => isSimpleFactItem(item, report)
  // Creating screenings (contrast, Fråga igen) needs a school administrator; every teacher can read.
  const creatable = item => Boolean(studentId) && canCreateScreening && contrastFollowUpEligible(item, report)
  const combinable = item => creatable(item)
    && (simple(item) || item.followUp?.delivery === 'reviewed_bank')
    && !didacticPackage(item.signalCode, byRef.get(item.supportRefs[0])?.interpretation.predictable?.scope)
    && !['revised', 'rejected'].includes(reviewFor(item)?.decision)
  const chosenItems = suspicions.filter(item => chosen.has(item.id) && combinable(item))
  const toggle = id => setChosen(value => { const next = new Set(value); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const slips = report.hypotheses.filter(slip)

  const detail = entry => selected?.ref === entry.ref && <section className="mt-1 mb-2 rounded border border-slate-300 p-3" aria-label="Rapportens källsvar">
    <QuestionText>{questionText(entry)}</QuestionText>
    <p>Elevens svar: {String(entry.answer.studentAnswer ?? 'saknas')} · Facit: {String(entry.answer.correctAnswer ?? 'manuell bedömning')}
      {entry.answer.teacherAssessed && <span className="text-sm"> · {teacherAssessedNote(entry.answer)}</span>}</p>
    <WorkEvidenceNote work={entry.interpretation.work} review={entry.teacherReview} />
    <p className="text-sm">{new Date(entry.timestamp).toLocaleString('sv-SE')} · {entry.source === 'practice' ? 'Träning' : 'Screening'}</p>
    {entry.source === 'screening' && <button type="button" className="mt-2 rounded border px-2 py-0.5 text-sm" onClick={async () => {
      setMessage('Hämtar originalet…')
      try {
        const params = new URLSearchParams({ resource: 'evidence', source: report.source, from: report.period.from, to: report.period.to,
          ref: entry.ref, snapshotRevision: report.snapshotRevision })
        const response = await diagnosticRequest(`${baseUrl}&${params}`)
        if (activeRef.current !== entry.ref) return
        if (!response.ok) throw new Error(response.status === 409 ? 'Källan har ändrats sedan rapporten sparades. Rapportens sparade svar är kvar; hämta ett nytt underlag för aktuellt räknehäfte.' : response.data.error)
        setOriginal(response.data.entry); setMessage('Originalet är hämtat utan ändringar.')
      } catch (error) { if (activeRef.current === entry.ref) setMessage(error.message || 'Originalet kunde inte hämtas.') }
    }}>Visa sparat räknehäfte</button>}
    {message && <p role="status" className="text-sm mt-2">{message}</p>}
    {original?.ref === entry.ref && original.detail && <DiagnosticAttemptHistory snapshot={original.detail.snapshot} task={original.question}
      imageContext={{ teacher: true, assignmentId: original.reference.assignmentId, classId: original.context.classIdAtAttempt }} />}
  </section>

  // One row per answer: task, the pupil's answer, the key, date and source. No click needed to read it.
  const rows = (refs, { wrong = true, note } = {}) => <ul className="mt-1 mb-1 space-y-0.5 tabular-nums">
    {refs.map((ref, index) => {
      const entry = byRef.get(ref)
      if (!entry) return null
      const text = questionText(entry)
      return <li key={ref}>
        <div className={`flex flex-wrap items-baseline gap-x-3 rounded px-2 py-0.5 ${wrong ? 'bg-blue-50' : 'bg-green-50'}`}>
          <span className="min-w-28">{/^[\d\s+−\-·×*/:.,]+$/u.test(text) ? `${text} =` : text}</span>
          <span className={`font-semibold ${wrong ? 'text-red-700' : 'text-green-700'}`}>{String(entry.answer.studentAnswer ?? '–')}
            {entry.answer.teacherAssessed && <span className="ml-1 text-[10px] font-medium" title={teacherAssessedNote(entry.answer)}>L</span>}</span>
          {wrong && <span className="text-sm">rätt {String(entry.answer.correctAnswer ?? '?')}</span>}
          {note?.(entry) && <span className="text-xs text-slate-600">{note(entry)}</span>}
          <span className="ml-auto text-xs text-slate-600">{entry.source === 'practice' ? 'träning' : 'screening'} {shortDate(entry.timestamp)}</span>
          {wrong && onHideSlip && slipExclusionKey(entry) && <button type="button" className="text-xs underline text-slate-700"
            aria-label={`Dölj som slarv: ${text}`} onClick={() => onHideSlip(slipExclusionKey(entry))}>Dölj som slarv</button>}
          <button type="button" className="text-xs underline text-slate-700" aria-expanded={selected?.ref === ref}
            aria-label={`Visa svar ${index + 1}: ${text}`} onClick={() => {
              const next = selected?.ref === ref ? null : entry
              activeRef.current = next?.ref ?? null; setSelected(next); setOriginal(null); setMessage('')
            }}>{selected?.ref === ref ? 'Dölj' : 'Detaljer'}</button>
        </div>
        {detail(entry)}
      </li>
    })}
  </ul>

  return <section aria-label="Analysrapport" className="mt-3 text-slate-900">
    <p className="text-sm text-slate-600">{originLabels[report.provenance.kind]} · {report.period.from}–{report.period.to} · {report.source === 'practice' ? 'Träning' : report.source === 'screening' ? 'Screening' : 'Träning och screening'} · {report.counts.total} svar: {report.counts.correct} rätt, {report.counts.incorrect} fel{(() => { const other = report.counts.total - report.counts.correct - report.counts.incorrect; return other ? `, övriga ${other}` : '' })()}.</p>
    <p className="mt-2 border-l-4 border-slate-300 pl-2 text-sm text-slate-700">Misstankarna är uträknade ur elevens svar: appen räknar fram vad en elev med felförståelsen skulle svara och jämför. De är inte diagnoser. Pröva dem med kontrastfrågor eller samtal.</p>

    <h5 className="mt-4 text-base font-semibold">Misstänkta felförståelser</h5>
    {!suspicions.length && <p className="text-sm">Inga felsvar i perioden passar en känd felförståelse.</p>}
    {suspicions.map(item => {
      const first = byRef.get(item.supportRefs[0])
      const description = item.signalCode ? modelDescription(item.signalCode, first?.interpretation.predictable?.scope) : null
      const weak = item.evidenceStatus === 'insufficient'
      // The area colour is an inset shadow, since the teacher themes override border colours.
      const area = areaOf(first)
      return <div key={item.id} data-hypothesis={item.signalCode || item.id} data-area={area.label}
        className="mt-3 border border-slate-200 py-2 pl-5 pr-3" style={{ boxShadow: `inset 7px 0 0 ${area.color}` }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h6 className="text-base font-semibold">
            <span className="mr-2 text-xs font-bold uppercase tracking-wide" style={{ color: area.color }}>{area.label}</span>
            {titleFor(item)}{suspicions.filter(other => other.signalCode && other.signalCode === item.signalCode).length > 1
            && SCOPE_LABELS[first?.interpretation.predictable?.scope] ? ` · ${SCOPE_LABELS[first.interpretation.predictable.scope]}` : ''}</h6>
          <span className="flex items-center gap-2">
            {combinable(item) && <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={chosen.has(item.id)} onChange={() => toggle(item.id)} /> Pröva tillsammans</label>}
            <span className={`rounded px-1.5 text-xs font-semibold ${weak ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-900'}`}>{weak ? 'Enstaka svar' : 'Misstanke'}</span>
          </span>
        </div>
        <p className="mt-1 text-sm"><strong>{item.supportCount} felsvar stämmer</strong>
          {item.counterCount ? ` · ${item.counterCount} rätt på jämförbara uppgifter där felet kunde ha synts` : ''}</p>
        <p className="mt-1 text-sm">{description?.thinkingSv || withoutCaveat(item.textSv)}</p>
        {rows(item.supportRefs)}
        {item.counterRefs.length > 0 && <>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Rätt trots att felet kunde synas</p>
          {rows(item.counterRefs, { wrong: false })}
        </>}
        <p className="mt-2 text-sm"><strong>Nästa steg:</strong> {item.nextCheckSv}</p>
        <ReportReviewNote review={reviewFor(item)} />
        {creatable(item) && simple(item) && (askAgain === item.id
          ? <MultiContrastFollowUp items={[item]} report={report} reviewFor={reviewFor} studentId={studentId} classId={classId} baseUrl={baseUrl} />
          : <button type="button" className="mt-2 rounded border px-2 py-1 text-sm" onClick={() => setAskAgain(item.id)}>Fråga igen</button>)}
        {creatable(item) && !simple(item) && <ContrastFollowUp key={`${item.id}:${savedItem?.checkIns.at(-1)?.revision ?? 0}`} item={item} report={report} reportReview={reviewFor(item)} studentId={studentId} classId={classId} baseUrl={baseUrl} />}
        {description?.openersSv?.length > 0 && <details className="mt-2 text-sm"><summary>Samtalsingångar</summary>
          <ul className="list-disc pl-5">{description.openersSv.map((value, i) => <li key={i}>{value}</li>)}</ul>
          {description.sourceSv && <p className="mt-1 text-xs text-slate-600">{description.sourceSv}</p>}
        </details>}
      </div>
    })}

    {chosenItems.length === 1 && <p className="mt-3 text-sm">Välj minst en misstanke till för att pröva dem i samma screening.</p>}
    {chosenItems.length >= 2 && <MultiContrastFollowUp key={chosenItems.map(item => item.id).join('|')} items={chosenItems} report={report}
      reviewFor={reviewFor} studentId={studentId} classId={classId} baseUrl={baseUrl} />}

    {(() => {
      const explained = new Set(report.hypotheses.flatMap(item => item.supportRefs))
      const unexplained = (report.exampleRefs || []).filter(ref => byRef.get(ref)?.answer.status === 'incorrect' && !explained.has(ref))
      return unexplained.length > 0 && <>
        <h5 className="mt-4 text-base font-semibold">Fel som appen inte kan förklara</h5>
        <p className="text-sm text-slate-600">Bland periodens första 20 svar. Här behövs ditt eget öga eller ett samtal med eleven.</p>
        {rows(unexplained)}
      </>
    })()}

    {slips.length > 0 && <details className="mt-4"><summary className="font-semibold">Troligen slarv eller inmatning ({slips.reduce((sum, item) => sum + item.supportCount, 0)} svar)</summary>
      <p className="mt-1 text-sm text-slate-600">Hålls isär från felförståelser. Upprepas samma mönster kan det ändå vara värt att fråga eleven.</p>
      {slips.map(item => <div key={item.id} className="mt-2">
        <p className="text-sm font-semibold">{titleFor(item)}</p>
        {rows(item.supportRefs)}
      </div>)}
    </details>}

    {report.strengths.length > 0 && <details className="mt-3"><summary className="font-semibold">Det som fungerar ({report.strengths.length} områden)</summary>
      {report.strengths.map(item => <div key={item.id} className="mt-2">
        <p className="text-sm font-semibold">{OPERATION_LABELS[byRef.get(item.refs[0])?.question.operation] || 'Område'}</p>
        {rows(item.refs, { wrong: false })}
      </div>)}
    </details>}

    <details className="mt-3 text-sm"><summary>Begränsningar och källrevision</summary>
      {report.limitationsSv.map((value, i) => <p key={i} className="mt-1">{value}</p>)}
      <p className="break-all mt-2">Källrevision: {report.snapshotRevision}</p>
      <p>Instruktionsversion: {report.provenance.instructionVersion}{report.provenance.model ? ` · Modell: ${report.provenance.model}` : ''}</p>
    </details>
  </section>
}
