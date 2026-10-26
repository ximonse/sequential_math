import { useEffect, useRef, useState } from 'react'
import { diagnosticRequest as request } from './diagnosticRequest'
import DiagnosticEvidenceDetails from './DiagnosticEvidenceDetails'

// Saved attempts of one pupil, in the order the server stored them, with the
// raw evidence one click away. This is the same data the table opens per cell.
export default function ScreeningPupilAttempts({ pupils, assignmentsFor }) {
  const [pick, setPick] = useState('')
  const [attempts, setAttempts] = useState([])
  const [status, setStatus] = useState('')
  const [detail, setDetail] = useState(null)
  const [version, setVersion] = useState(0)
  const selection = useRef('')
  const chosen = pupils.find(pupil => `${pupil.classId}:${pupil.studentId}` === pick)
  selection.current = pick

  useEffect(() => {
    setDetail(null)
    if (!chosen) { setAttempts([]); setStatus(''); return undefined }
    let active = true
    const { classId, studentId } = chosen
    const mine = assignmentsFor(classId).filter(assignment => assignment.studentIds?.includes(studentId))
    setStatus('Hämtar sparade försök...')
    void Promise.all(mine.map(async assignment => {
      const search = new URLSearchParams({ classId, studentId, assignmentId: assignment.assignmentId })
      const result = await request(`/api/teacher-diagnostic-attempts?${search}`)
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte hämta elevens försök.')
      return (result.data.attempts || []).map(attempt => ({ ...attempt, assignmentId: assignment.assignmentId }))
    })).then(groups => {
      if (!active) return
      const found = groups.flat()
      setAttempts(found)
      setStatus(found.length ? '' : 'Eleven har ännu inget sparat försök.')
    }).catch(error => { if (active) setStatus(error.message || 'Kunde inte hämta försök.') })
    return () => { active = false }
    // assignmentsFor reads state that is replaced on every load; the pick and version drive reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick, version])

  async function openEvidence(attempt) {
    const selected = selection.current
    setDetail(null)
    setStatus('Hämtar underlaget...')
    const search = new URLSearchParams({ classId: chosen.classId, studentId: chosen.studentId,
      assignmentId: attempt.assignmentId, attemptId: attempt.attemptId })
    try {
      const result = await request(`/api/teacher-diagnostic-attempts?${search}`)
      if (selection.current !== selected) return
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte öppna underlaget.')
      setDetail(result.data)
      setStatus('')
    } catch (error) {
      if (selection.current === selected) setStatus(error.message || 'Kunde inte öppna underlaget.')
    }
  }

  return <details className="mt-4 text-sm">
    <summary className="cursor-pointer font-semibold">Sparade försök för en elev</summary>
    <label className="mt-2 block font-medium">Elev
      <select value={pick} onChange={event => setPick(event.target.value)} className="mt-1 block w-full rounded border border-slate-300 bg-white px-1.5 py-0.5">
        <option value="">Välj elev</option>
        {pupils.map(pupil => <option key={`${pupil.classId}:${pupil.studentId}`} value={`${pupil.classId}:${pupil.studentId}`}>
          {pupil.name || pupil.displayAlias || pupil.studentId}</option>)}
      </select>
    </label>
    {chosen && <button type="button" onClick={() => setVersion(value => value + 1)}
      className="mt-2 rounded border border-orange-700 bg-white px-1.5 py-0.5 text-slate-800">Uppdatera försök</button>}
    {status && <p role="status" className="mt-1">{status}</p>}
    {attempts.length > 0 && <ul className="mt-2 space-y-2">
      {attempts.map(attempt => <li key={attempt.attemptId} className="flex flex-wrap items-center gap-2">
        <span>{attempt.taskId} · {attempt.createdAt ? new Date(attempt.createdAt).toLocaleString('sv-SE') : 'äldre försök'} · {attempt.status === 'submitted' ? 'fryst' : 'pågående'} · {attempt.lastSequence} händelser</span>
        <button type="button" onClick={() => openEvidence(attempt)} className="rounded border border-orange-700 bg-white px-1.5 py-0.5 text-slate-800">Visa underlag</button>
      </li>)}
    </ul>}
    {detail && <DiagnosticEvidenceDetails detail={detail} />}
  </details>
}
