import { useState } from 'react'
import StudentCredentialCards from './StudentCredentialCards'

export default function PilotRosterPanel({ className, schoolId, onCreate, disabled }) {
  const [count, setCount] = useState(25)
  const [credentials, setCredentials] = useState([])
  const [status, setStatus] = useState('')

  const create = async () => {
    setStatus('')
    const result = await onCreate(schoolId, Number(count))
    if (Array.isArray(result?.credentials) && result.credentials.length) setCredentials(result.credentials)
    setStatus(result?.ok
      ? result.addedCount + ' elevplatser är klara. Hämta PDF:en nu.'
      : result?.error || 'Kunde inte skapa elevplatserna.')
  }

  return (
    <section className="mb-4 rounded border border-teal-200 bg-teal-50 p-3">
      <h3 className="text-sm font-semibold text-teal-950">Namnfria elevplatser</h3>
      <p className="mt-1 text-xs text-teal-900">
        Skapar elevkonton utan angivna namn, med kodnamn, QR-kod och fyrsiffrig PIN.
        Uppgifterna visas bara här i minnet tills PDF:en har hämtats.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-teal-950">
          Antal elevplatser
          <input
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={event => setCount(event.target.value)}
            className="mt-1 block w-28 rounded border border-teal-300 bg-white px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={create}
          disabled={disabled || !String(className || '').trim()}
          className="rounded bg-teal-700 px-3 py-2 text-sm text-white hover:bg-teal-800 disabled:opacity-50"
        >
          Skapa namnfria elevplatser
        </button>
      </div>
      {!String(className || '').trim() ? <p className="mt-2 text-xs text-amber-800">Ange först klassnamn ovan.</p> : null}
      {status ? <p role="status" className="mt-2 text-xs text-teal-950">{status}</p> : null}
      <StudentCredentialCards credentials={credentials} title="Nya elevkort" onClear={() => {
        setCredentials([])
        setStatus('Uppgifterna har tagits bort från vyn.')
      }} />
    </section>
  )
}
