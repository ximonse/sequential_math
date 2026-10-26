import { useEffect, useRef, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'
import DiagnosticEvidenceDetails from './DiagnosticEvidenceDetails'
import DiagnosticScreeningMatrix from './DiagnosticScreeningMatrix'
import { mergeOverviews } from './screeningCollections'

// One table for a collection: one assignment per class, merged by position.
// `members` are the assignments to read, `isAllowed(classId, studentId)` keeps
// only the pupils the picked recipients cover.
export default function DiagnosticCollectionReview({ members, isAllowed, name, onDirtyChange }) {
  const [overview, setOverview] = useState(null)
  const [itemId, setItemId] = useState('')
  const [detail, setDetail] = useState(null)
  const [message, setMessage] = useState('Hämtar status...')
  const [refresh, setRefresh] = useState(0)
  const selection = useRef(0)
  const dirty = useRef(false)
  const dialog = useRef(null)
  const returnFocus = useRef(null)
  const memberKey = members.map(member => `${member.classId}:${member.assignmentId}`).join(',')
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
    setOverview(null)
    setMessage('Hämtar status...')
    void Promise.all(members.map(async ({ classId, assignmentId }) => {
      const search = new URLSearchParams({ classId, assignmentId })
      const result = await diagnosticRequest(`/api/teacher-diagnostic-attempts?${search}`)
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte hämta översikten.')
      return { classId, assignmentId, overview: result.data }
    })).then(parts => {
      if (!active) return
      const merged = mergeOverviews(parts, isAllowed)
      setOverview(merged)
      setItemId(previous => merged.items.some(item => item.assignmentItemId === previous) ? previous : merged.items[0]?.assignmentItemId || '')
      setMessage(merged.mismatched.length
        ? 'Några klasser har andra frågor och visas inte i tabellen. Öppna dem var för sig.'
        : 'Status från servern. Klicka Uppdatera översikt för att hämta nya inlämningar.')
    }).catch(error => { if (active) setMessage(error.message) })
    return () => { active = false }
    // memberKey stands for members; isAllowed changes only with the picked recipients.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey, refresh])

  const rowOf = studentId => overview?.rows.find(row => row.studentId === studentId)
  const queue = (overview?.rows || []).map(row => ({ studentId: row.studentId,
    ...row.items.find(item => item.assignmentItemId === itemId) })).filter(item => item.attemptId)
  const current = queue.findIndex(item => item.attemptId === detail?.record.attemptId)

  async function open(item) {
    if (!allowNavigation()) return
    const origin = item.classId ? item : { ...item, ...rowOf(item.studentId), items: undefined }
    const version = ++selection.current
    if (!dialog.current.open) returnFocus.current = document.activeElement
    setMessage('Hämtar underlaget...')
    try {
      const search = new URLSearchParams({ classId: origin.classId, assignmentId: origin.assignmentId, studentId: item.studentId, attemptId: item.attemptId })
      const result = await diagnosticRequest(`/api/teacher-diagnostic-attempts?${search}`)
      if (version !== selection.current) return
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte öppna underlaget.')
      if (item.assignmentItemId) setItemId(item.assignmentItemId)
      setDetail({ ...result.data, readVersion: version })
      setMessage('')
    } catch (error) { if (version === selection.current) setMessage(error.message) }
  }
  function resetDetail() {
    if (!allowNavigation()) return false
    selection.current++
    setDetail(null)
    return true
  }

  return <section className="mt-4" aria-label="Genomgång av samling">
    <button type="button" onClick={() => setRefresh(value => value + 1)} className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-sm">Uppdatera översikt</button>
    <p role="status" className="mt-2 text-sm">{message}</p>
    {overview && (overview.rows.length > 0
      ? <DiagnosticScreeningMatrix overview={overview} name={name} onOpen={open} />
      : <p className="text-sm">Ingen av de valda eleverna fick den här samlingen.</p>)}
    <dialog ref={dialog} aria-label="Elevgenomgång" onCancel={event => { event.preventDefault(); resetDetail() }} className="max-h-[90dvh] w-[min(960px,95vw)] rounded-lg border border-slate-300 bg-white p-3 text-slate-800 shadow-xl backdrop:bg-slate-900/50">
      {detail && <>
        <p role="status" className="text-sm">{message}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2"><strong className="mr-auto">{name(detail.record.studentId)}</strong>
          <button type="button" onClick={resetDetail} className="rounded border border-slate-300 px-1.5 py-0.5 text-sm">Stäng genomgång</button>
          <button type="button" disabled={current <= 0} onClick={() => open(queue[current - 1])} className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-sm disabled:opacity-50">Föregående elev</button>
          <button type="button" disabled={current < 0 || current >= queue.length - 1} onClick={() => open(queue[current + 1])} className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-sm disabled:opacity-50">Nästa elev</button>
          <button type="button" onClick={() => open({ studentId: detail.record.studentId, attemptId: detail.record.attemptId })} className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-sm">Öppna senaste underlag</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1" aria-label="Elevens uppgifter">{overview?.items.map((item, index) => {
          const attempt = rowOf(detail.record.studentId)?.items.find(value => value.assignmentItemId === item.assignmentItemId)
          return <button key={item.assignmentItemId} type="button" disabled={!attempt?.attemptId} aria-pressed={itemId === item.assignmentItemId}
            onClick={() => open({ ...attempt, studentId: detail.record.studentId })} className="rounded border border-slate-300 px-1.5 py-0.5 text-sm aria-pressed:border-indigo-500 aria-pressed:bg-indigo-100 disabled:opacity-40">Uppgift {index + 1}</button>
        })}</div>
        <DiagnosticEvidenceDetails key={`${detail.record.attemptId}:${detail.record.serverRevision}:${detail.readVersion}`} detail={detail} reviewable onDirtyChange={value => { dirty.current = value; onDirtyChange?.(value) }} onSaved={() => setRefresh(value => value + 1)} />
      </>}
    </dialog>
  </section>
}
