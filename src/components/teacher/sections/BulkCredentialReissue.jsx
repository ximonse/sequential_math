import { useState } from 'react'
import { reissueStudentCredentials } from '../../../lib/credentialReissue'
import StudentCredentialCards from './StudentCredentialCards'

function studentLabel(student) {
  return student.name || student.displayAlias || student.studentId
}

export default function BulkCredentialReissue({ students }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [issued, setIssued] = useState([])

  const chosen = students.filter(student => selectedIds.includes(student.studentId))
  const toggle = studentId => setSelectedIds(previous => (
    previous.includes(studentId) ? previous.filter(id => id !== studentId) : [...previous, studentId]
  ))

  const issue = async () => {
    if (busy || chosen.length === 0) return
    const confirmed = window.confirm(
      `Skapa nya kort för ${chosen.length} elev${chosen.length === 1 ? '' : 'er'}?\n\n`
      + 'Ny PIN och nytt QR-kort utfärdas, och de gamla korten slutar fungera direkt. '
      + 'Kodnamn, namn och all träningsdata behålls.'
    )
    if (!confirmed) return
    setBusy(true)
    setIssued([])
    try {
      const { credentials, failed } = await reissueStudentCredentials(
        chosen.map(student => student.studentId),
        { onProgress: (done, total) => setStatus(`Skapar kort ${done} av ${total}…`) }
      )
      setIssued(credentials)
      setSelectedIds(failed.map(item => item.studentId))
      const failedNames = failed
        .map(item => studentLabel(students.find(student => student.studentId === item.studentId) || { studentId: item.studentId }))
        .join(', ')
      setStatus([
        credentials.length ? `${credentials.length} nya kort är klara. Hämta PDF:en nu, PIN-koderna visas bara här.` : '',
        failed.length ? `${failed.length} kunde inte skapas (${failedNames}). De är fortfarande markerade, försök igen.` : ''
      ].filter(Boolean).join(' '))
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1.5">
      <summary className="cursor-pointer text-xs font-medium text-amber-950">Nya kort för valda elever</summary>
      <p className="mt-1 text-xs text-amber-900">Ny PIN och nytt QR-kort till de elever du kryssar i. Kodnamn, namn och träningsdata behålls.</p>
      <div className="mt-2 flex gap-2 text-xs">
        <button type="button" onClick={() => setSelectedIds(students.map(student => student.studentId))} disabled={busy} className="rounded bg-amber-100 px-2 py-1 text-amber-950 hover:bg-amber-200 disabled:opacity-50">Markera alla</button>
        <button type="button" onClick={() => setSelectedIds([])} disabled={busy} className="rounded bg-amber-100 px-2 py-1 text-amber-950 hover:bg-amber-200 disabled:opacity-50">Ingen</button>
      </div>
      <div className="mt-2 grid max-h-56 gap-1 overflow-auto rounded bg-white p-2 sm:grid-cols-2">
        {students.map(student => (
          <label key={student.studentId} className="flex cursor-pointer items-center gap-2 text-xs text-gray-800">
            <input type="checkbox" checked={selectedIds.includes(student.studentId)} onChange={() => toggle(student.studentId)} disabled={busy} />
            <span className="truncate font-medium">{studentLabel(student)}</span>
          </label>
        ))}
      </div>
      <button type="button" onClick={issue} disabled={busy || chosen.length === 0} className="mt-2 rounded bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50">
        {busy ? 'Skapar kort…' : `Skapa nya kort för ${chosen.length} vald${chosen.length === 1 ? '' : 'a'} elev${chosen.length === 1 ? '' : 'er'}`}
      </button>
      {status ? <p role="status" className="mt-2 text-xs text-amber-950">{status}</p> : null}
      <StudentCredentialCards credentials={issued} title="Nya elevkort" onClear={() => { setIssued([]); setStatus('Elevkorten har tagits bort från vyn.') }} />
    </details>
  )
}
