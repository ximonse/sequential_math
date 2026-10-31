import { useMemo, useRef, useState } from 'react'
import manifest from '../../../domains/arithmetic/diagnosticTasks.v1.json'
import { buildContrastSet, CONTRAST_LABELS_SV } from '../../../domains/predictableErrors/contrast.js'
import { questionFingerprint } from '../../../domains/predictableErrors/probes.js'
import { evidenceProblem } from '../../../lib/evidencePredictableAnalysis.js'
import { isSpeedTrainingEntry } from '../../../lib/practiceModes.js'
import { OPERATION_LABELS } from '../../../lib/operations.js'
import { diagnosticRequest } from './diagnosticRequest.js'

// Directed follow-up (practice-modes, mode 4): contrast questions for one
// computed error model. Creates a private draft only; review, approval and
// dispatch stay in the existing material review.

const label = model => CONTRAST_LABELS_SV[model] || model

async function call(url, body) {
  const result = await diagnosticRequest(url, body ? { method: 'POST', body: JSON.stringify(body) } : {})
  if (!result.ok) throw new Error(result.data.error || 'Åtgärden kunde inte bekräftas. Inget har delats ut.')
  return result.data
}

export default function ContrastFollowUp({ item, report, studentId, classId }) {
  const [open, setOpen] = useState(false)
  const [grid, setGrid] = useState(true)
  const [state, setState] = useState({ busy: false, message: '', receipt: null })
  const requestId = useRef(crypto.randomUUID())
  const supports = useMemo(() => item.supportRefs.map(ref => report.evidence.find(e => e.ref === ref))
    .filter(entry => entry && !isSpeedTrainingEntry(entry)), [item, report])
  const set = useMemo(() => buildContrastSet({ modelId: item.signalCode, supportProblems: supports.map(evidenceProblem),
    bankTasks: manifest.tasks, seenFingerprints: new Set(report.evidence.map(e => questionFingerprint(evidenceProblem(e)))) }), [item, report, supports])
  const [, ...rivals] = set.models
  const operation = supports[0]?.question.operation

  async function createDraft() {
    setState({ busy: true, message: 'Skapar privat utkast…', receipt: null })
    try {
      const audience = await call(`/api/students?${new URLSearchParams({ resource: 'audience', targetType: 'student', targetId: studentId, limit: 1 })}`)
      const material = { schemaVersion: 1, kind: 'screening', mode: 'specific',
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

  if (!open) return <button type="button" className="mt-2 rounded border px-2 py-1 text-sm" onClick={() => setOpen(true)}>Pröva med kontrastfrågor</button>
  return <section aria-label="Kontrastfrågor" className="mt-2 rounded border border-slate-300 p-2 text-sm">
    <p className="font-semibold">Kontrastfrågor – valda så att förklaringarna ger olika svar</p>
    {set.status !== 'proposed' ? <p className="mt-1">{set.reasonSv}</p> : <>
      <p className="mt-1">Högst 5 frågor ur den granskade frågebanken. Facit och modellsvar räknas i appen, utan AI. Inga tips under prövningen.</p>
      <div className="mt-1 overflow-x-auto"><table className="min-w-full">
        <thead><tr><th className="text-left">Fråga</th><th className="text-right">Facit</th>
          {set.models.map(m => <th key={m} className="text-right">{label(m)}</th>)}</tr></thead>
        <tbody>{set.items.map(q => <tr key={q.taskId} className="border-t">
          <td>{q.text}</td><td className="text-right tabular-nums">{q.correct}</td>
          {set.models.map(m => <td key={m} className="text-right tabular-nums">{q.predictions[m] ?? '–'}</td>)}</tr>)}</tbody>
      </table></div>
      {set.unresolved.length > 0 && <p className="mt-1">Banken skiljer inte alla förklaringar åt: {set.unresolved.map(pair => pair.map(p => p === 'correct' ? 'rätt svar' : label(p)).join(' / ')).join('; ')}. Elevens uträkning behövs där.</p>}
      <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} /> Eleven visar uträkningen i räknehäftet</label>
      <p className="mt-1 text-slate-600">Bara rapportens egna svar kontrolleras mot upprepning.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={state.busy || Boolean(state.receipt)} className="rounded border px-2 py-1" onClick={createDraft}>Skapa utkast</button>
        <button type="button" disabled={state.busy} className="rounded border px-2 py-1" onClick={() => setOpen(false)}>Stäng</button>
        {state.receipt && <a className="underline" href={state.receipt.reviewPath}>Öppna granskning</a>}
      </div></>}
    {state.message && <p role="status" className="mt-1">{state.message}</p>}
  </section>
}
