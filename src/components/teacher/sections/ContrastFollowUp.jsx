import { useMemo, useRef, useState } from 'react'
import { CONTRAST_LABELS_SV } from '../../../domains/predictableErrors/contrast.js'
import { pupilFollowUpSelection } from '../../../lib/pupilFollowUpSelection.js'
import { isSpeedTrainingEntry } from '../../../lib/practiceModes.js'
import { OPERATION_LABELS } from '../../../lib/operations.js'
import { call, screeningHistory } from './contrastHistory.js'
import { didacticPackage } from '../../../lib/didacticFollowUp.js'

// Directed follow-up (practice-modes, mode 4): contrast questions for one
// computed error model. Creates a private draft only; review, approval and
// dispatch stay in the existing material review.

const label = model => CONTRAST_LABELS_SV[model] || model

export default function ContrastFollowUp({ item, report, reportReview, studentId, classId, baseUrl }) {
  const [open, setOpen] = useState(false)
  const [grid, setGrid] = useState(true)
  const [reopen, setReopen] = useState(false)
  const needsReopen = ['revised', 'rejected'].includes(reportReview?.decision)
  const [state, setState] = useState({ busy: false, message: '', receipt: null })
  const [history, setHistory] = useState({ status: 'idle', keys: null, message: '' })
  const requestId = useRef(crypto.randomUUID())
  const supports = useMemo(() => item.supportRefs.map(ref => report.evidence.find(e => e.ref === ref))
    .filter(entry => entry && !isSpeedTrainingEntry(entry)), [item, report])
  const teachingPackage = didacticPackage(item.signalCode, supports[0]?.interpretation?.predictable?.scope)
  const set = useMemo(() => history.keys && pupilFollowUpSelection({ modelId: item.signalCode, supports, entries: report.evidence,
    historyKeys: [...history.keys, ...(item.followUp?.history.excludedFingerprints ?? [])],
    history: { scope: 'source_period_and_screening_since_2024', completeness: 'indexed_screening_window_read_practice_unknown' } }),
  [item, report, supports, history.keys])
  const packageReady = !teachingPackage || (reportReview && set?.items.length === 2)

  async function openPanel() {
    setOpen(true)
    if (history.keys) return
    setHistory({ status: 'loading', keys: null, message: 'Kontrollerar elevens tidigare screeningar…' })
    try { setHistory({ status: 'ready', keys: await screeningHistory(baseUrl), message: '' }) }
    catch (error) { setHistory({ status: 'error', keys: null, message: `${error.message} Inga kontrastfrågor föreslås utan den kontrollen.` }) }
  }
  const [, ...rivals] = set?.models ?? []
  const operation = supports[0]?.question.operation

  async function createDraft() {
    if ((needsReopen && !reopen) || !packageReady) return
    setState({ busy: true, message: 'Skapar privat utkast…', receipt: null })
    try {
      const audience = await call(`/api/students?${new URLSearchParams({ resource: 'audience', targetType: 'student', targetId: studentId, limit: 1 })}`)
      const material = { schemaVersion: 1, kind: 'screening', mode: 'specific',
        investigation: { schemaVersion: 1, modelId: item.signalCode, ruleVersion: item.ruleVersion,
          ...(reportReview ? { reportReview: { studentId, reportId: reportReview.reportId, hypothesisId: item.id,
            checkInRevision: reportReview.checkInRevision, reopen } } : {}) },
        // The title reaches the pupil; the suspicion stays in teacher-only fields.
        titleSv: `Uppföljning: ${(OPERATION_LABELS[operation] || 'räkning').toLowerCase()}`,
        goalSv: `Pröva om felen följer felmodellen ”${label(item.signalCode)}” eller en annan förklaring. Råd till läraren, inte en fastställd orsak.`,
        instructionSv: 'Räkna uppgifterna. Visa hur du räknar.',
        sourceMaterials: [], audience: { targetType: 'student', targetId: studentId, rosterRevision: audience.rosterRevision },
        classContexts: { [studentId]: classId },
        basis: [{ studentId, classId, from: report.period.from, to: report.period.to, source: report.source,
          snapshotRevision: report.snapshotRevision, supportRefs: supports.map(e => e.ref), counterRefs: item.counterRefs,
          reasonSv: `Beräknad felmodell: ${label(item.signalCode)}. Kontrastfrågorna prövar den mot ${rivals.map(label).join(', ') || 'rätt svar'}. Inga tips under prövningen.` }],
        content: { taskIds: set.items.map(q => q.taskId),
          itemOptions: Object.fromEntries(set.items.map(q => [q.taskId, { gridEnabled: grid }])) } }
      const preview = await call('/api/teacher-material', { action: 'preview', material })
      const receipt = await call('/api/teacher-material', { action: 'save', material, requestId: requestId.current,
        expectedRevision: 0, expectedContentRevision: preview.contentRevision })
      setState({ busy: false, message: 'Privat utkast sparat. Inget har delats ut.', receipt })
    } catch (error) {
      setState({ busy: false, message: error.message, receipt: null })
    }
  }

  if (!open) return <button type="button" className="mt-2 rounded border px-2 py-1 text-sm" onClick={openPanel}>Pröva med kontrastfrågor</button>
  if (!set) return <section aria-label="Kontrastfrågor" className="mt-2 rounded border border-slate-300 p-2 text-sm">
    <p role="status">{history.message}</p>
    {history.status === 'error' && <button type="button" className="mt-2 rounded border px-2 py-1" onClick={openPanel}>Försök igen</button>}
    <button type="button" className="mt-2 rounded border px-2 py-1" onClick={() => setOpen(false)}>Stäng</button>
  </section>
  return <section aria-label="Kontrastfrågor" className="mt-2 rounded border border-slate-300 p-2 text-sm">
    <p className="font-semibold">Kontrastfrågor – valda så att förklaringarna ger olika svar</p>
    {item.followUp && JSON.stringify(item.followUp.items.map(q => q.taskId)) !== JSON.stringify(set.items.map(q => q.taskId)) && <p className="mt-1">Förslaget har ändrats efter kontroll av äldre screeningar. Rapportens ursprungliga förslag är kvar ovan.</p>}
    {set.status !== 'proposed' ? <p className="mt-1">{set.reasonSv}</p> : <>
      <p className="mt-1">{set.delivery === 'reviewed_bank' ? 'Högst 5 frågor ur den granskade frågebanken.' : 'Råd till läraren. Frågorna saknar ännu utdelningsbar bankversion.'} Facit och modellsvar räknas i appen, utan AI. Inga tips under prövningen.</p>
      <div className="mt-1 overflow-x-auto"><table className="min-w-full">
        <thead><tr><th className="text-left">Fråga</th><th className="text-right">Facit</th>
          {set.models.map(m => <th key={m} className="text-right">{label(m)}</th>)}</tr></thead>
        <tbody>{set.items.map(q => <tr key={q.taskId} className="border-t">
          <td>{q.text}</td><td className="text-right tabular-nums">{q.correct}</td>
          {set.models.map(m => <td key={m} className="text-right tabular-nums">{Array.isArray(q.predictions[m]) ? q.predictions[m].join(' eller ') : q.predictions[m] ?? '–'}</td>)}</tr>)}</tbody>
      </table></div>
      {set.unresolved.length > 0 && <p className="mt-1">Banken skiljer inte alla förklaringar åt: {set.unresolved.map(pair => pair.map(p => p === 'correct' ? 'rätt svar' : label(p)).join(' / ')).join('; ')}. Elevens uträkning behövs där.</p>}
      <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} /> Eleven visar uträkningen i räknehäftet</label>
      {needsReopen && <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={reopen} onChange={event => setReopen(event.target.checked)} /> Jag väljer att pröva den ursprungliga modellen igen; min sparade tolkning följer med.</label>}
      <p className="mt-1 text-slate-600">Rapportens källurval och tillgängliga screeningar från 2024 till idag är kontrollerade. Historikens fullständighet är okänd. Äldre screeningar och träning utanför källurvalet kan innehålla samma frågor.</p>
      {teachingPackage && !reportReview && <p className="mt-1">Spara rapportversionen först, så kan undervisningsnotering och nya kontroller knytas till samma rapport.</p>}
      {teachingPackage && set.items.length !== 2 && <p className="mt-1">Pilotpaketet behöver två nya prövningsfrågor. Alla paketets frågor är inte tillgängliga som nya kontroller.</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {set.delivery === 'reviewed_bank' && <button type="button" disabled={state.busy || Boolean(state.receipt) || (needsReopen && !reopen) || !packageReady} className="rounded border px-2 py-1" onClick={createDraft}>Skapa utkast</button>}
        <button type="button" disabled={state.busy} className="rounded border px-2 py-1" onClick={() => setOpen(false)}>Stäng</button>
        {state.receipt && <a className="underline" href={state.receipt.reviewPath}>Öppna granskning</a>}
      </div></>}
    {state.message && <p role="status" className="mt-1">{state.message}</p>}
  </section>
}
