import { useState } from 'react'
import { getTeacherApiToken } from '../../../lib/teacherAuth'

async function requestRollover(body) {
  const response = await fetch('/api/admin/classes/rollover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
    body: JSON.stringify(body)
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Kunde inte genomföra årsbytet.')
  return data
}

export default function SchoolYearRollover({ schools, onCompleted, setStatus }) {
  const [schoolId, setSchoolId] = useState('')
  const [graduatingGrade, setGraduatingGrade] = useState(6)
  const [exitYear, setExitYear] = useState(new Date().getFullYear())
  const [changes, setChanges] = useState([])
  const [snapshot, setSnapshot] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const clearPreview = () => { setChanges([]); setSnapshot(null); setError('') }

  const preview = async () => {
    if (!schoolId) return
    setBusy(true); clearPreview()
    try {
      const data = await requestRollover({ schoolId, graduatingGrade, exitYear, dryRun: true })
      setChanges(data.changes || [])
      setSnapshot(data.snapshot || null)
      if (!data.changes?.length) setError(data.message || 'Inga klasser kan ändras automatiskt.')
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  const updateChange = (id, field, value) => {
    setChanges(previous => previous.map(change => change.id === id ? { ...change, [field]: value } : change))
  }

  const apply = async () => {
    const selectedCount = changes.filter(change => change.action !== 'skip').length
    if (!selectedCount || !snapshot || !window.confirm(`Genomför ${selectedCount} förhandsgranskade klassändringar?`)) return
    setBusy(true); setError('')
    try {
      const data = await requestRollover({
        schoolId, graduatingGrade, exitYear, dryRun: false, changes, snapshot
      })
      setStatus(`✓ Årsbyte klart: ${data.changes.length} klasser har uppdaterats.`)
      clearPreview()
      await onCompleted()
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
      <h3 className="font-semibold text-amber-950">Nytt läsår</h3>
      <p className="mt-1 text-amber-900">
        Förslaget höjer årskurser och arkiverar avgångsklassen. Du kan ändra varje rad innan allt sparas atomiskt.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="text-gray-700">Skola
          <select value={schoolId} onChange={event => { setSchoolId(event.target.value); clearPreview() }} className="mt-1 block w-full rounded border px-2 py-1.5" disabled={busy}>
            <option value="">Välj skola</option>
            {schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
          </select>
        </label>
        <label className="text-gray-700">Avgångsårskurs
          <input type="number" min="1" max="9" value={graduatingGrade} onChange={event => { setGraduatingGrade(Number(event.target.value)); clearPreview() }} className="mt-1 block w-full rounded border px-2 py-1.5" />
        </label>
        <label className="text-gray-700">Avgångsår
          <input type="number" min="2000" max="2200" value={exitYear} onChange={event => { setExitYear(Number(event.target.value)); clearPreview() }} className="mt-1 block w-full rounded border px-2 py-1.5" />
        </label>
      </div>
      <button type="button" onClick={preview} disabled={!schoolId || busy} className="mt-2 rounded bg-amber-700 px-3 py-1.5 font-semibold text-white disabled:opacity-50">
        Förhandsgranska
      </button>
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      {changes.length > 0 && (
        <div className="mt-3">
          <p className="font-medium text-amber-950">Kontrollera och redigera förslaget</p>
          <div className="mt-2 space-y-2">
            {changes.map(change => (
              <div key={change.id} className="grid items-center gap-2 rounded bg-white p-2 sm:grid-cols-[1fr_9rem_2fr]">
                <span className="font-medium text-gray-800">{change.from}</span>
                <select value={change.action} onChange={event => updateChange(change.id, 'action', event.target.value)} className="rounded border px-2 py-1">
                  <option value="rename">Byt namn</option>
                  <option value="archive">Arkivera</option>
                  <option value="skip">Hoppa över</option>
                </select>
                <input value={change.to} disabled={change.action === 'skip'} onChange={event => updateChange(change.id, 'to', event.target.value)} className="rounded border px-2 py-1 disabled:bg-gray-100" />
              </div>
            ))}
          </div>
          <button type="button" onClick={apply} disabled={busy || !changes.some(change => change.action !== 'skip')} className="mt-3 rounded bg-indigo-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">
            Genomför årsbyte
          </button>
        </div>
      )}
    </div>
  )
}
