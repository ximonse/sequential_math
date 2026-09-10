import { useState } from 'react'
import { getTeacherApiToken } from '../../../lib/teacherAuth'

async function requestRollover(schoolId, dryRun) {
  const response = await fetch('/api/admin/classes/rollover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
    body: JSON.stringify({ schoolId, dryRun })
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Kunde inte genomföra årsbytet.')
  return data
}

export default function SchoolYearRollover({ schools, onCompleted, setStatus }) {
  const [schoolId, setSchoolId] = useState('')
  const [changes, setChanges] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const preview = async () => {
    if (!schoolId) return
    setBusy(true); setError(''); setChanges([])
    try {
      const data = await requestRollover(schoolId, true)
      setChanges(data.changes || [])
      if (!data.changes?.length) setError(data.message || 'Inga klasser kan höjas automatiskt.')
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  const apply = async () => {
    if (!changes.length || !window.confirm('Byt namn på de förhandsgranskade klasserna? Klass-ID, elevlänkar och elevhistorik ändras inte.')) return
    setBusy(true); setError('')
    try {
      const data = await requestRollover(schoolId, false)
      setStatus(`✓ Årsbyte klart: ${data.changes.length} klasser har fått nya namn.`)
      setChanges([])
      await onCompleted()
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
      <h3 className="font-semibold text-amber-950">Nytt läsår</h3>
      <p className="mt-1 text-amber-900">Höjer klassnamn som börjar med årskurs 4–8, till exempel 4B → 5B. Klass-ID, elever, historik och elevlänkar behålls.</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1 text-gray-700">Skola
          <select value={schoolId} onChange={event => { setSchoolId(event.target.value); setChanges([]); setError('') }} className="mt-1 block w-full rounded border px-2 py-1.5" disabled={busy}>
            <option value="">Välj skola</option>
            {schools.map(school => <option key={school.id} value={school.id}>{school.name}</option>)}
          </select>
        </label>
        <button type="button" onClick={preview} disabled={!schoolId || busy} className="rounded bg-amber-700 px-3 py-1.5 font-semibold text-white disabled:opacity-50">Förhandsgranska</button>
      </div>
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      {changes.length > 0 && (
        <div className="mt-3">
          <p className="font-medium text-amber-950">Föreslagna namnbyten</p>
          <ul className="mt-1 space-y-0.5 text-amber-950">{changes.map(change => <li key={change.id}>{change.from} → {change.to} <span className="text-amber-800">(ID: {change.id})</span></li>)}</ul>
          <button type="button" onClick={apply} disabled={busy} className="mt-2 rounded bg-indigo-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">Genomför årsbyte</button>
        </div>
      )}
    </div>
  )
}