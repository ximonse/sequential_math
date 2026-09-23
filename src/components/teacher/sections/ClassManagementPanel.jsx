import { useRef, useState } from 'react'
import QRCode from 'qrcode'
import { parseRosterLines } from '../../../lib/storageClassHelpers'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import { downloadStudentCredentialPdf } from '../../../lib/studentCredentialPdf'
import ClassLoginQrDialog from './ClassLoginQrDialog'
import StudentCredentialCards from './StudentCredentialCards'
import TeacherGroupsPanel from './TeacherGroupsPanel'
import { useSchools } from './SchoolControls'

export default function ClassManagementPanel({
  addToClassId,
  onSetAddToClassId,
  classes,
  onAddExistingStudentsToClass,
  onAddStudentsToClass,
  rosterInput,
  onSetRosterInput,
  classStatus,
  students,
  recordMatchesClassFilter,
  onMoveStudent,
  onOpenStudentDetail,
  onStatusChange,
  canResetStudentAccounts = false
}) {
  const directory = useSchools()
  const [busy, setBusy] = useState(false)
  const [selectedExistingStudentIds, setSelectedExistingStudentIds] = useState([])
  const [moveFromClassId, setMoveFromClassId] = useState('')
  const [moveToClassId, setMoveToClassId] = useState('')
  const [moveStudentId, setMoveStudentId] = useState('')
  const [issuedCredentials, setIssuedCredentials] = useState([])
  const [resetStatus, setResetStatus] = useState('')
  const [qrClass, setQrClass] = useState(null)
  const busyRef = useRef(false)
  const classLabel = item => `${item.name} · ${directory.schools.find(school => school.id === item.schoolId)?.name || 'Skola ej angiven'}`
  const orderedClasses = [...classes].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'sv'))
  const names = parseRosterLines(rosterInput)

  const runRosterAction = async action => {
    if (busyRef.current) return undefined
    busyRef.current = true
    setBusy(true)
    try { return await action() } finally { busyRef.current = false; setBusy(false) }
  }
  const showIssuedCredentials = result => {
    if (Array.isArray(result?.credentials) && result.credentials.length) setIssuedCredentials(result.credentials)
    return result
  }
  const resetClassStudentAccounts = async classRecord => {
    const confirmed = window.confirm(`Återställ alla elevkonton i ${classRecord.name}?\n\nAll elevdata rensas: träningshistorik, äldre lösenord, gamla QR-kort, PIN-koder och kodnamn. Förnamn och klasstillhörighet behålls. Nya elevkort måste hämtas direkt efteråt.`)
    if (!confirmed) return
    setResetStatus('Återställer elevkonton...')
    const response = await fetch('/api/student-class-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
      body: JSON.stringify({ classId: classRecord.id })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setResetStatus(data.error || 'Kunde inte återställa elevkontona.')
      return
    }
    setIssuedCredentials(data.credentials || [])
    setResetStatus(`${data.credentials?.length || 0} elevkonton är återställda. Hämta PDF:en innan du lämnar sidan.`)
  }

  const availableExistingStudents = students.filter(student => !recordMatchesClassFilter(student, [addToClassId]))
  const movableStudents = students.filter(student => recordMatchesClassFilter(student, [moveFromClassId]))
  const toggleExistingStudent = studentId => setSelectedExistingStudentIds(previous => (
    previous.includes(studentId) ? previous.filter(id => id !== studentId) : [...previous, studentId]
  ))

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Elever och klasslänkar</h2>
      <p className="mb-3 text-sm text-gray-600">Lägg till eller flytta elever i klasser som du ansvarar för. Klassnamn, skolor och lärartilldelningar hanteras i administrationsvyn.</p>
      <fieldset disabled={busy} aria-busy={busy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
          <select value={addToClassId} onChange={event => onSetAddToClassId(event.target.value)} className="px-3 py-2 border rounded text-sm">
            <option value="">Välj klass att lägga till i</option>
            {orderedClasses.map(item => <option key={`add-${item.id}`} value={item.id}>{classLabel(item)}</option>)}
          </select>
          <button onClick={() => runRosterAction(async () => showIssuedCredentials(await onAddStudentsToClass()))} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm">
            Lägg till elever i vald klass
          </button>
        </div>
        <textarea value={rosterInput} onChange={event => onSetRosterInput(event.target.value)} placeholder={'Klistra in elevlista - en per rad eller med kommatecken\nAnna Andersson\nBo Berg'} className="w-full min-h-28 px-3 py-2 border rounded text-sm mb-3" />
        <p className="text-xs text-gray-500 mb-2">En elev per rad, eller separera med kommatecken eller semikolon. Namn måste vara unika inom klassen. Varje ny elev får eget ID, kodnamn, QR-kod och PIN — hämta elevkorten direkt efter skapandet.</p>
        <p className="text-xs text-gray-500 mb-2">Listan skapar nya elever; den flyttar inte en befintlig elev med samma namn.</p>

        {addToClassId && onAddExistingStudentsToClass ? (
          <details className="mb-3 rounded border border-indigo-100 bg-indigo-50 p-2 text-sm">
            <summary className="cursor-pointer font-medium text-indigo-800">Lägg till befintliga elever ({availableExistingStudents.length} möjliga)</summary>
            <p className="mt-2 text-xs text-indigo-800">Välj elev-ID:n här om en elev redan finns i en annan klass.</p>
            {availableExistingStudents.length > 0 ? <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded bg-white p-2">
              {availableExistingStudents.map(student => <label key={student.studentId} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={selectedExistingStudentIds.includes(student.studentId)} onChange={() => toggleExistingStudent(student.studentId)} />
                  <span>{student.name || student.displayAlias}</span><span className="font-mono text-gray-400">{student.studentId}</span>
              </label>)}
            </div> : <p className="mt-2 text-xs text-gray-500">Alla kända elever finns redan i den valda klassen.</p>}
            <button type="button" disabled={selectedExistingStudentIds.length === 0} onClick={() => runRosterAction(async () => {
              const saved = await onAddExistingStudentsToClass(selectedExistingStudentIds)
              if (saved) setSelectedExistingStudentIds([])
            })} className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">Lägg till {selectedExistingStudentIds.length || ''} vald(a) elev(er)</button>
          </details>
        ) : null}

        {classes.length > 1 && onMoveStudent ? (
          <details className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm">
            <summary className="cursor-pointer font-medium text-amber-900">Flytta elev till annan klass</summary>
            <p className="mt-2 text-xs text-amber-900">Elevens ID och träningshistorik följer med.</p>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
              <select value={moveFromClassId} onChange={event => { setMoveFromClassId(event.target.value); setMoveStudentId('') }} className="rounded border px-2 py-1 text-xs"><option value="">Från klass</option>{orderedClasses.map(item => <option key={`move-from-${item.id}`} value={item.id}>{classLabel(item)}</option>)}</select>
              <select value={moveStudentId} onChange={event => setMoveStudentId(event.target.value)} disabled={!moveFromClassId} className="rounded border px-2 py-1 text-xs disabled:bg-gray-100"><option value="">Välj elev</option>{movableStudents.map(student => <option key={student.studentId} value={student.studentId}>{student.name || student.displayAlias} · {student.studentId}</option>)}</select>
              <select value={moveToClassId} onChange={event => setMoveToClassId(event.target.value)} className="rounded border px-2 py-1 text-xs"><option value="">Till klass</option>{orderedClasses.filter(item => item.id !== moveFromClassId).map(item => <option key={`move-to-${item.id}`} value={item.id}>{classLabel(item)}</option>)}</select>
            </div>
            <button type="button" disabled={!moveFromClassId || !moveToClassId || !moveStudentId} onClick={() => runRosterAction(async () => {
              const moved = await onMoveStudent(moveStudentId, moveFromClassId, moveToClassId)
              if (moved) { setMoveStudentId(''); setMoveToClassId('') }
            })} className="mt-2 rounded bg-amber-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">Flytta elev</button>
          </details>
        ) : null}

        {names.length > 0 && <details className="text-sm mb-3" open><summary>{names.length} elever i listan — kontrollera före sparning</summary><ol className="list-decimal pl-6 max-h-48 overflow-auto">{names.map((name, index) => <li key={index}>{name}</li>)}</ol></details>}
        <p role="status" className="text-xs text-gray-600 mb-3">{busy ? 'Sparar på servern…' : classStatus || resetStatus || ' '}</p>
        <StudentCredentialCards credentials={issuedCredentials} title="Nya elevkort" onClear={() => { setIssuedCredentials([]); setResetStatus('Elevkorten har tagits bort från vyn.') }} />

        {orderedClasses.length > 0 ? <div className="space-y-1.5">
          {orderedClasses.map(item => {
            const classStudents = students.filter(student => recordMatchesClassFilter(student, [item.id]))
            const loggedInCount = classStudents.filter(student => student.auth?.lastLoginAt).length
            return <div key={item.id} className="border rounded px-2 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-sm font-medium text-gray-800">{classLabel(item)}</p><p className="text-xs text-gray-500">Klass-ID: {item.id} · {classStudents.length} elever | {loggedInCount} har loggat in</p></div>
                {item.loginToken && <div className="flex flex-wrap gap-1"><button onClick={() => setQrClass(item)} className="px-2 py-1 bg-slate-800 hover:bg-slate-950 text-white rounded text-xs">Visa QR-kod</button><button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?class=${item.loginToken}`)} className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-xs">Kopiera elevlänk</button></div>}
              </div>
              {classStudents.length > 0 && <details className="mt-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5"><summary className="cursor-pointer text-xs font-medium text-slate-800">Elever och elevkort ({classStudents.length})</summary><div className="mt-2 grid gap-1">{classStudents.map(student => <div key={`${item.id}-${student.studentId}`} className="rounded bg-white px-2 py-1.5 text-xs"><div className="flex items-center justify-between gap-2"><span className="truncate font-medium">{student.name || student.displayAlias}</span>{onOpenStudentDetail && <button type="button" onClick={() => onOpenStudentDetail(student.studentId)} className="rounded bg-slate-200 px-2 py-1">Öppna elevprofil</button>}</div><StudentCredentialIssuer student={student} /></div>)}</div></details>}
              {canResetStudentAccounts && <details className="mt-2 rounded border border-rose-200 bg-rose-50 p-2"><summary className="cursor-pointer text-xs font-medium text-rose-900">Återställ alla elevkonton</summary><p className="mt-1 text-xs text-rose-900">Rensar elevdata i klassen och utfärdar nya QR-kort/PIN.</p><button type="button" onClick={() => runRosterAction(() => resetClassStudentAccounts(item))} className="mt-2 rounded bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white">Återställ och skapa nya elevkort</button></details>}
            </div>
          })}
        </div> : null}
      </fieldset>

      <div className="mt-8 border-t border-gray-200 pt-6"><h2 className="mb-3 text-lg font-semibold text-gray-800">Grupper</h2><TeacherGroupsPanel students={students} onStatusChange={onStatusChange} /></div>
      {qrClass && <ClassLoginQrDialog classRecord={qrClass} onClose={() => setQrClass(null)} />}
    </div>
  )
}

function StudentCredentialIssuer({ student }) {
  const [credential, setCredential] = useState(null)
  const [qrCode, setQrCode] = useState('')
  const [status, setStatus] = useState('')
  const issue = async () => {
    const label = student.displayAlias || student.studentId
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
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium text-amber-950">Elevkort</p><button type="button" onClick={issue} className="rounded bg-amber-700 px-2 py-1 text-xs font-semibold text-white">Nytt QR-kort / PIN</button></div>
    {status && <p role="status" className="mt-1 text-xs text-amber-900">{status}</p>}
    {credential && <div className="mt-2 flex items-center gap-3 rounded bg-white p-2 text-xs"><div className="min-w-0"><p className="font-semibold">{credential.displayAlias || student.displayAlias}</p><p>Kodnamn: {credential.displayAlias || student.displayAlias || '–'}</p><p className="font-mono break-all">Elev-ID: {credential.studentId}</p><p className="font-mono text-sm font-bold">PIN: {credential.pin}</p></div>{qrCode && <img className="h-24 w-24 shrink-0" src={qrCode} alt={`QR-kod för ${credential.displayAlias || credential.studentId}`} />}</div>}
    {credential && <button type="button" onClick={async () => { setStatus('Skapar PDF…'); try { await downloadStudentCredentialPdf([credential]); setStatus('PDF klar. Spara filen säkert.') } catch (error) { setStatus(error?.message || 'Kunde inte skapa PDF.') } }} className="mt-2 rounded bg-amber-700 px-2 py-1 text-xs font-semibold text-white">Hämta PDF</button>}
  </div>
}
