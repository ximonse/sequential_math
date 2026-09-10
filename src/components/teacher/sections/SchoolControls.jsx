import { useEffect, useState } from 'react'
import { getTeacherApiToken } from '../../../lib/teacherAuth'

async function schoolRequest(options = {}) {
  const response = await fetch('/api/teacher-schools', {
    ...options, headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() }, cache: 'no-store'
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Kunde inte hämta skolor.')
  return data
}

export function useSchools() {
  const [schools, setSchools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true)
    schoolRequest().then(data => {
      if (active) { setSchools(data.schools || []); setError('') }
    }).catch(() => {
      if (active) setError('Skolorna kunde inte hämtas. Försök igen.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const createSchool = async name => {
    const data = await schoolRequest({ method: 'POST', body: JSON.stringify({ name }) })
    setSchools(previous => [...previous, data.school].sort((a, b) => a.name.localeCompare(b.name, 'sv')))
    return data.school
  }
  return { schools, loading, error, createSchool, retry: () => setAttempt(value => value + 1) }
}

export function SchoolSelect({ schools, value, onChange, disabled, label = 'Skola' }) {
  return <label className="block text-sm text-gray-700">
    <span className="mb-1 block">{label}</span>
    <select value={value || ''} disabled={disabled} onChange={event => onChange(event.target.value)}
      className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100">
      <option value="">Skola ej angiven</option>
      {value && !schools.some(school => school.id === value) && <option value={value}>Hämtar vald skola…</option>}
      {schools.map(school => <option key={school.id} value={school.id}>
        {school.name}{schools.filter(other => other.name === school.name).length > 1 ? ` · ${school.id.slice(-6)}` : ''}
      </option>)}
    </select>
  </label>
}

export function NewSchoolForm({ directory, onCreated }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  return <div className="mb-4 rounded border border-blue-100 bg-blue-50 p-3 text-sm">
    <p className="text-gray-700">Välj en befintlig skola eller lägg till din skola. Klasser och grupper kopplas till skolan; elevens ID och historik följer med vid klassbyte.</p>
    {directory.error && <p role="alert" className="mt-2 text-red-700">{directory.error} <button type="button" onClick={directory.retry} className="underline">Hämta igen</button></p>}
    <details className="mt-2">
      <summary className="cursor-pointer text-blue-800">Lägg till skola</summary>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex-1">Skolans namn
          <input value={name} maxLength={100} disabled={busy} onChange={event => setName(event.target.value)}
            placeholder="Skolnamn och ort" className="mt-1 block w-full rounded border px-3 py-2" />
        </label>
        <button type="button" disabled={busy || directory.loading || Boolean(directory.error) || !name.trim()} onClick={async () => {
          setBusy(true); setStatus('')
          try {
            const school = await directory.createSchool(name.trim())
            setName(''); setStatus('Skolan är sparad.'); onCreated?.(school.id)
          } catch (error) { setStatus(error.message || 'Skolan kunde inte sparas. Försök igen.') }
          finally { setBusy(false) }
        }} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50">{busy ? 'Sparar…' : 'Spara skola'}</button>
      </div>
      <p role="status" className="mt-1">{status}</p>
    </details>
  </div>
}

export function ClassSchoolChoice({ classRecord, directory, onSave, disabled }) {
  const [schoolId, setSchoolId] = useState(classRecord.schoolId || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <div className="mt-2 flex flex-wrap items-end gap-2">
    <SchoolSelect schools={directory.schools} value={schoolId} onChange={setSchoolId}
      disabled={disabled || busy || directory.loading || Boolean(directory.error)} label={`Skola för ${classRecord.name}`} />
    <button type="button" disabled={disabled || busy || directory.loading || Boolean(directory.error) || schoolId === (classRecord.schoolId || '')}
      onClick={async () => {
        setBusy(true); setError('')
        try { if (!await onSave(classRecord.id, classRecord.name, schoolId)) setError('Kunde inte spara skolkopplingen.') }
        catch { setError('Kunde inte spara skolkopplingen. Försök igen.') }
        finally { setBusy(false) }
      }} className="rounded bg-blue-100 px-3 py-2 text-sm text-blue-800 disabled:opacity-50">{busy ? 'Sparar…' : 'Spara skolkoppling'}</button>
    {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
  </div>
}
