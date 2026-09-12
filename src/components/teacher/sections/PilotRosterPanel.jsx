import { useState } from 'react'

function credentialText(credentials) {
  return credentials.map(({ displayAlias, studentId, qrSecret, pin }) => (
    displayAlias + '\nElev-ID: ' + studentId + '\nQR-hemlighet: ' + qrSecret + '\nPIN: ' + pin
  )).join('\n\n')
}

export default function PilotRosterPanel({ className, schoolId, onCreate, disabled }) {
  const [count, setCount] = useState(25)
  const [credentials, setCredentials] = useState([])
  const [status, setStatus] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  const create = async () => {
    setStatus('')
    setCopyStatus('')
    const result = await onCreate(schoolId, Number(count))
    if (Array.isArray(result?.credentials) && result.credentials.length) {
      setCredentials(result.credentials)
    }
    setStatus(result?.ok
      ? result.addedCount + ' pseudonyma elevplatser är klara. Skriv ut eller kopiera uppgifterna nu.'
      : result?.error || 'Kunde inte skapa elevplatserna.')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credentialText(credentials))
      setCopyStatus('Kopierat. Klistra in i skolans godkända dokument och radera därifrån när utdelningen är klar.')
    } catch {
      setCopyStatus('Kunde inte kopiera automatiskt. Markera uppgifterna och kopiera manuellt.')
    }
  }

  return (
    <section className="mb-4 rounded border border-teal-200 bg-teal-50 p-3">
      <h3 className="text-sm font-semibold text-teal-950">Pseudonyma elevplatser</h3>
      <p className="mt-1 text-xs text-teal-900">
        Skapar helt namnfria elevkonton med slumpad visningskod, QR-hemlighet och fyrsiffrig PIN.
        Uppgifterna visas bara här i minnet och sparas inte i webbläsaren.
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
          Skapa pseudonyma elevplatser
        </button>
      </div>
      {!String(className || '').trim() ? (
        <p className="mt-2 text-xs text-amber-800">Ange först klassnamn ovan. Inga elevnamn behövs.</p>
      ) : null}
      {status ? <p role="status" className="mt-2 text-xs text-teal-950">{status}</p> : null}
      {credentials.length ? (
        <div className="mt-3 rounded border border-teal-300 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-900">Inloggningsuppgifter — visas endast tills sidan laddas om</p>
            <div className="flex gap-2 print:hidden">
              <button type="button" onClick={copy} className="rounded bg-teal-700 px-2 py-1 text-xs text-white">Kopiera</button>
              <button type="button" onClick={() => window.print()} className="rounded border border-teal-700 px-2 py-1 text-xs text-teal-900">Skriv ut</button>
              <button type="button" onClick={() => { setCredentials([]); setCopyStatus(''); setStatus('Uppgifterna har tagits bort från vyn.') }} className="rounded border border-gray-400 px-2 py-1 text-xs text-gray-700">Rensa vyn</button>
            </div>
          </div>
          {copyStatus ? <p className="mt-2 text-xs text-teal-900 print:hidden">{copyStatus}</p> : null}
          <ol className="mt-3 grid gap-2 md:grid-cols-2">
            {credentials.map(credential => (
              <li key={credential.studentId} className="rounded border border-gray-200 p-2 text-xs text-gray-800">
                <p className="font-semibold">{credential.displayAlias}</p>
                <p className="font-mono break-all">Elev-ID: {credential.studentId}</p>
                <p className="font-mono break-all">QR-hemlighet: {credential.qrSecret}</p>
                <p className="font-mono">PIN: {credential.pin}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}
