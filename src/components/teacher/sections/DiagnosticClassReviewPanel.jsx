import { useEffect, useRef, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'
import DiagnosticEvidenceDetails from './DiagnosticEvidenceDetails'
import DiagnosticScreeningMatrix from './DiagnosticScreeningMatrix'


export default function DiagnosticClassReviewPanel({ classId, assignments, pupils, onDirtyChange }) {
  const [assignmentId, setAssignmentId] = useState('')
  const [overview, setOverview] = useState(null)
  const [itemId, setItemId] = useState('')
  const [detail, setDetail] = useState(null)
  const [message, setMessage] = useState('Välj ett uppdrag för klassgenomgång.')
  const [refresh, setRefresh] = useState(0)
  const selection = useRef(0)
  const dirty = useRef(false)
  const dialog = useRef(null)
  const returnFocus = useRef(null)
  useEffect(() => {
    if (detail && !dialog.current.open) dialog.current.showModal()
    if (!detail && dialog.current.open) { dialog.current.close(); returnFocus.current?.focus() }
  }, [detail])
  function allowNavigation() {
    if (dirty.current && !window.confirm('Genomgången har osparade ändringar. Vill du lämna dem?')) return false
    dirty.current = false
    onDirtyChange?.(false)
    return true
  }

  useEffect(() => {
    let active = true
    if (!assignmentId) return undefined
    setOverview(null)
    setMessage('Hämtar klassens status...')
    const search = new URLSearchParams({ classId, assignmentId })
    void diagnosticRequest(`/api/teacher-diagnostic-attempts?${search}`).then(result => {
      if (!active) return
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte hämta klassöversikten.')
      setOverview(result.data)
      setItemId(previous => result.data.items.some(item => item.assignmentItemId === previous) ? previous : result.data.items[0]?.assignmentItemId || '')
      setMessage('Status från servern. Klicka Uppdatera klassöversikt för att hämta nya inlämningar.')
    }).catch(error => { if (active) setMessage(error.message) })
    return () => { active = false }
  }, [classId, assignmentId, refresh])

  const name = id => {
    const pupil = pupils.find(pupil => pupil.studentId === id)
    return pupil?.name || pupil?.displayAlias || id
  }
  const queue = (overview?.rows || []).map(row => ({ studentId: row.studentId,
    ...row.items.find(item => item.assignmentItemId === itemId) })).filter(item => item.attemptId)
  const current = queue.findIndex(item => item.attemptId === detail?.record.attemptId)

  async function open(item) {
    if (!allowNavigation()) return
    const version = ++selection.current
    if (!dialog.current.open) returnFocus.current = document.activeElement
    setMessage('Hämtar underlaget...')
    try {
      const search = new URLSearchParams({ classId, assignmentId, studentId: item.studentId, attemptId: item.attemptId })
      const result = await diagnosticRequest(`/api/teacher-diagnostic-attempts?${search}`)
      if (version !== selection.current) return
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte öppna underlaget.')
      setItemId(result.data.record.assignmentItemId)
      setDetail({ ...result.data, readVersion: version })
      setMessage('')
    } catch (error) { if (version === selection.current) setMessage(error.message) }
  }
  function resetDetail() {
    if (!allowNavigation()) return false
    selection.current++; setDetail(null)
    return true
  }

  return <section className="mt-5 border-t border-slate-300 pt-4" aria-label="Klassgenomgång">
    <h3 className="font-semibold">Klassöversikt och genomgång</h3>
    <label className="mt-2 block text-sm">Uppdrag att gå igenom
      <select value={assignmentId} onChange={event => { if (!resetDetail()) return; setOverview(null); setItemId(''); setAssignmentId(event.target.value) }} className="mt-1 block w-full rounded border border-slate-300 bg-white px-2 py-1">
        <option value="">Välj uppdrag</option>
        {assignments.map(assignment => <option key={assignment.assignmentId} value={assignment.assignmentId}>
          {new Date(assignment.createdAt).toLocaleString('sv-SE')} · {assignment.items.length} uppgifter · {assignment.studentIds.length} elever · {assignment.assignmentId.slice(0, 8)}
        </option>)}
      </select>
    </label>
    {assignmentId && <button type="button" onClick={() => setRefresh(value => value + 1)} className="mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-sm">Uppdatera klassöversikt</button>}
    <p role="status" className="mt-2 text-sm">{message}</p>
    {overview && <>
      <DiagnosticScreeningMatrix overview={overview} name={name} onOpen={open} />
    </>}
    <dialog ref={dialog} aria-label="Elevgenomgång" onCancel={event => { event.preventDefault(); resetDetail() }} className="max-h-[90dvh] w-[min(960px,95vw)] rounded-lg border border-slate-300 bg-white p-3 text-slate-800 shadow-xl backdrop:bg-slate-900/50">
    {detail && <>
      <p role="status" className="text-sm">{message}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2"><strong className="mr-auto">{name(detail.record.studentId)}</strong>
        <button type="button" onClick={resetDetail} className="rounded border border-slate-300 px-2 py-1 text-sm">Stäng genomgång</button>
        <button type="button" disabled={current <= 0} onClick={() => open(queue[current - 1])} className="rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50">Föregående elev</button>
        <button type="button" disabled={current < 0 || current >= queue.length - 1} onClick={() => open(queue[current + 1])} className="rounded border border-slate-300 bg-white px-2 py-1 text-sm disabled:opacity-50">Nästa elev</button>
        <button type="button" onClick={() => open({ studentId: detail.record.studentId, attemptId: detail.record.attemptId })} className="rounded border border-slate-300 bg-white px-2 py-1 text-sm">Öppna senaste underlag</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1" aria-label="Elevens uppgifter">{overview?.items.map((item, index) => {
        const attempt = overview.rows.find(row => row.studentId === detail.record.studentId)?.items.find(value => value.assignmentItemId === item.assignmentItemId)
        return <button key={item.assignmentItemId} type="button" disabled={!attempt?.attemptId} aria-pressed={detail.record.assignmentItemId === item.assignmentItemId}
          onClick={() => open({ ...attempt, studentId: detail.record.studentId })} className="rounded border border-slate-300 px-2 py-1 text-sm aria-pressed:border-indigo-500 aria-pressed:bg-indigo-100 disabled:opacity-40">Uppgift {index + 1}</button>
      })}</div>
      <DiagnosticEvidenceDetails key={`${detail.record.attemptId}:${detail.record.serverRevision}:${detail.readVersion}`} detail={detail} reviewable onDirtyChange={value => { dirty.current = value; onDirtyChange?.(value) }} onSaved={() => setRefresh(value => value + 1)} />
    </>}
    </dialog>
  </section>
}
