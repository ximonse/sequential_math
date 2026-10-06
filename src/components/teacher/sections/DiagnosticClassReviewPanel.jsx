import { useEffect, useRef, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'
import DiagnosticEvidenceDetails from './DiagnosticEvidenceDetails'

const statuses = { not_started: 'Inte påbörjat', in_progress: 'Påbörjat', submitted: 'Alla inlämnade' }

export default function DiagnosticClassReviewPanel({ classId, assignments, pupils, onDirtyChange }) {
  const [assignmentId, setAssignmentId] = useState('')
  const [overview, setOverview] = useState(null)
  const [itemId, setItemId] = useState('')
  const [detail, setDetail] = useState(null)
  const [message, setMessage] = useState('Välj ett uppdrag för klassgenomgång.')
  const [refresh, setRefresh] = useState(0)
  const selection = useRef(0)
  const dirty = useRef(false)
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
    setDetail(null)
    setMessage('Hämtar underlaget...')
    try {
      const search = new URLSearchParams({ classId, assignmentId, studentId: item.studentId, attemptId: item.attemptId })
      const result = await diagnosticRequest(`/api/teacher-diagnostic-attempts?${search}`)
      if (version !== selection.current) return
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte öppna underlaget.')
      setDetail(result.data)
      setMessage('')
    } catch (error) { if (version === selection.current) setMessage(error.message) }
  }
  function resetDetail() {
    if (!allowNavigation()) return false
    selection.current++; setDetail(null)
    return true
  }

  return <section className="mt-5 border-t border-orange-300 pt-4" aria-label="Klassgenomgång">
    <h3 className="font-semibold">Klassöversikt och genomgång</h3>
    <label className="mt-2 block text-sm">Uppdrag att gå igenom
      <select value={assignmentId} onChange={event => { if (!resetDetail()) return; setOverview(null); setItemId(''); setAssignmentId(event.target.value) }} className="mt-1 block w-full rounded border border-orange-300 bg-white p-2">
        <option value="">Välj uppdrag</option>
        {assignments.map(assignment => <option key={assignment.assignmentId} value={assignment.assignmentId}>
          {new Date(assignment.createdAt).toLocaleString('sv-SE')} · {assignment.items.length} uppgifter · {assignment.studentIds.length} elever · {assignment.assignmentId.slice(0, 8)}
        </option>)}
      </select>
    </label>
    {assignmentId && <button type="button" onClick={() => setRefresh(value => value + 1)} className="mt-2 rounded border border-orange-700 bg-white px-3 py-1 text-sm">Uppdatera klassöversikt</button>}
    <p role="status" className="mt-2 text-sm">{message}</p>
    {overview && <>
      <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Elevstatus i valt diagnosuppdrag</caption>
        <thead><tr><th className="p-2">Elev</th><th className="p-2">Status</th><th className="p-2">Inlämnade</th><th className="p-2">Kvar</th><th className="p-2">Genomgångna</th></tr></thead>
        <tbody>{overview.rows.map(row => <tr key={row.studentId} className="border-t border-orange-200"><th className="p-2 font-medium">{name(row.studentId)}</th>
          <td className="p-2">{statuses[row.status]}</td><td className="p-2">{row.submitted} / {overview.items.length}</td><td className="p-2">{row.remaining}</td><td className="p-2">{row.reviewed} / {overview.items.length}</td></tr>)}</tbody>
      </table></div>
      <label className="mt-3 block text-sm">Uppgift att gå igenom
        <select value={itemId} onChange={event => { if (!resetDetail()) return; setItemId(event.target.value) }} className="mt-1 block w-full rounded border border-orange-300 bg-white p-2">
          {overview.items.map(item => <option key={item.assignmentItemId} value={item.assignmentItemId}>{item.promptSv}</option>)}
        </select>
      </label>
      <p className="mt-2 text-sm">Sparade lösningar för uppgiften. Elever utan sparat försök finns kvar i översikten ovan.</p>
      <div className="mt-2 flex flex-wrap gap-2">{queue.map(item => <button type="button" key={item.attemptId} onClick={() => open(item)} className="rounded border border-orange-700 bg-white px-3 py-1 text-sm" aria-pressed={item.attemptId === detail?.record.attemptId}>
        {name(item.studentId)} · {item.status === 'submitted' ? 'inlämnad' : 'pågående'}{item.reviewed ? ' · genomgången' : ''}
      </button>)}</div>
      {!queue.length && <p className="mt-2 text-sm">Ingen har ännu ett sparat försök för uppgiften.</p>}
    </>}
    {detail && <>
      <div className="mt-3 flex flex-wrap items-center gap-2"><strong>{name(detail.record.studentId)}</strong>
        <button type="button" disabled={current <= 0} onClick={() => open(queue[current - 1])} className="rounded border border-orange-700 bg-white px-3 py-1 text-sm disabled:opacity-50">Föregående elev</button>
        <button type="button" disabled={current < 0 || current >= queue.length - 1} onClick={() => open(queue[current + 1])} className="rounded border border-orange-700 bg-white px-3 py-1 text-sm disabled:opacity-50">Nästa elev</button>
        <button type="button" onClick={() => open({ studentId: detail.record.studentId, attemptId: detail.record.attemptId })} className="rounded border border-orange-700 bg-white px-3 py-1 text-sm">Öppna senaste underlag</button>
      </div>
      <DiagnosticEvidenceDetails key={`${detail.record.attemptId}:${detail.record.serverRevision}`} detail={detail} reviewable onDirtyChange={value => { dirty.current = value; onDirtyChange?.(value) }} onSaved={() => setRefresh(value => value + 1)} />
    </>}
  </section>
}
