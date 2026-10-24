import { useState } from 'react'
import QRCode from 'qrcode'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import { downloadStudentCredentialPdf } from '../../../lib/studentCredentialPdf'
import BulkCredentialReissue from './BulkCredentialReissue'

// New QR cards and PINs for single pupils or several at once.
export default function ClassLoginTab({ classStudents }) {
  if (classStudents.length === 0) return <p className="text-xs text-gray-500">Klassen har inga elever ännu.</p>
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-gray-600">Ett nytt kort ersätter det gamla direkt. Det gamla QR-kortet och den gamla PIN-koden slutar fungera.</p>
      <ul className="grid gap-1">
        {classStudents.map(student => <li key={student.studentId} data-login-pupil className="rounded border border-gray-200 bg-white px-2 py-1.5 text-xs">
          <span className="font-medium">{student.name || student.displayAlias}</span>
          <StudentCredentialIssuer student={student} />
        </li>)}
      </ul>
      <BulkCredentialReissue students={classStudents} />
    </div>
  )
}

function StudentCredentialIssuer({ student }) {
  const [credential, setCredential] = useState(null)
  const [qrCode, setQrCode] = useState('')
  const [status, setStatus] = useState('')
  const issue = async () => {
    const label = student.name || student.displayAlias || student.studentId
    if (!window.confirm(`Skapa nytt QR-kort och ny PIN för ${label}? Det gamla kortet slutar fungera direkt.`)) return
    setStatus('Skapar nytt elevkort…')
    try {
      const response = await fetch(`/api/student/${encodeURIComponent(student.studentId)}/credentials`, { method: 'POST', headers: { 'x-teacher-token': getTeacherApiToken() } })
      const data = await response.json()
      if (!response.ok || !data?.credential) throw new Error(data?.error || 'Kunde inte skapa elevkortet.')
      setCredential(data.credential)
      setQrCode(await QRCode.toDataURL(JSON.stringify({ version: 1, studentId: data.credential.studentId, qrSecret: data.credential.qrSecret }), { errorCorrectionLevel: 'M', margin: 1, width: 260 }))
      setStatus('Nytt elevkort är klart. Skriv ut eller dela ut det nu.')
    } catch (error) { setStatus(error.message || 'Kunde inte skapa elevkortet.') }
  }
  return <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium text-amber-950">Elevkort</p><button type="button" onClick={issue} className="rounded bg-amber-700 px-1.5 py-0.5 text-xs font-semibold text-white">Nytt QR-kort / PIN</button></div>
    {status && <p role="status" className="mt-1 text-xs text-amber-900">{status}</p>}
    {credential && <div className="mt-2 flex items-center gap-3 rounded bg-white p-2 text-xs"><div className="min-w-0"><p className="font-semibold">{credential.displayAlias || student.displayAlias}</p><p>Kodnamn: {credential.displayAlias || student.displayAlias || '–'}</p><p className="font-mono break-all">Elev-ID: {credential.studentId}</p><p className="font-mono text-sm font-bold">PIN: {credential.pin}</p></div>{qrCode && <img className="h-24 w-24 shrink-0" src={qrCode} alt={`QR-kod för ${credential.displayAlias || credential.studentId}`} />}</div>}
    {credential && <button type="button" onClick={async () => { setStatus('Skapar PDF…'); try { await downloadStudentCredentialPdf([credential]); setStatus('PDF klar. Spara filen säkert.') } catch (error) { setStatus(error?.message || 'Kunde inte skapa PDF.') } }} className="mt-2 rounded bg-amber-700 px-1.5 py-0.5 text-xs font-semibold text-white">Hämta PDF</button>}
  </div>
}
