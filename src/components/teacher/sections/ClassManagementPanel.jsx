import { useSchools } from './SchoolControls'
import { useRef, useState } from 'react'
import { parseRosterLines } from '../../../lib/storageClassHelpers'
import ClassLoginQrDialog from './ClassLoginQrDialog'
import TeacherGroupsPanel from './TeacherGroupsPanel'

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
  onStatusChange
}) {
  const directory = useSchools()
  const [busy, setBusy] = useState(false)
  const [selectedExistingStudentIds, setSelectedExistingStudentIds] = useState([])
  const [moveFromClassId, setMoveFromClassId] = useState('')
  const [moveToClassId, setMoveToClassId] = useState('')
  const [moveStudentId, setMoveStudentId] = useState('')
  const [qrClass, setQrClass] = useState(null)
  const busyRef = useRef(false)
  const classLabel = item => `${item.name} · ${directory.schools.find(school => school.id === item.schoolId)?.name || 'Skola ej angiven'}`
  const names = parseRosterLines(rosterInput)
  const runRosterAction = async (action) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try { await action() }
    finally { busyRef.current = false; setBusy(false) }
  }
  const availableExistingStudents = students.filter(student => (
    !recordMatchesClassFilter(student, [addToClassId])
  ))
  const movableStudents = students.filter(student => recordMatchesClassFilter(student, [moveFromClassId]))
  const toggleExistingStudent = (studentId) => {
    setSelectedExistingStudentIds(previous => (
      previous.includes(studentId)
        ? previous.filter(id => id !== studentId)
        : [...previous, studentId]
    ))
  }
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Elever och klasslänkar</h2>
      <p className="mb-3 text-sm text-gray-600">Lägg till eller flytta elever i klasser som du ansvarar för. Klassnamn, skolor och lärartilldelningar hanteras i administrationsvyn.</p>
      <fieldset disabled={busy} aria-busy={busy}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <select
          value={addToClassId}
          onChange={(event) => onSetAddToClassId(event.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">Välj klass att lägga till i</option>
          {classes.map(item => (
            <option key={`add-${item.id}`} value={item.id}>
              {classLabel(item)}
            </option>
          ))}
        </select>
        <button
          onClick={() => runRosterAction(onAddStudentsToClass)}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
        >
          Lägg till elever i vald klass
        </button>
      </div>
      <textarea
        value={rosterInput}
        onChange={(event) => onSetRosterInput(event.target.value)}
        placeholder={'Klistra in elevlista - en per rad eller med kommatecken\\nAnna Andersson\\nBo Berg'}
        className="w-full min-h-28 px-3 py-2 border rounded text-sm mb-3"
      />
      <p className="text-xs text-gray-500 mb-2">
        En elev per rad, eller separera med kommatecken eller semikolon. Namn måste vara unika inom klassen. Varje ny elev får en personlig fyrsiffrig kod som visas när listan sparas.
      </p>
      <p className="text-xs text-gray-500 mb-2">
        Listan skapar nya elever; den flyttar inte en befintlig elev med samma namn.
      </p>
      {addToClassId && onAddExistingStudentsToClass ? (
        <details className="mb-3 rounded border border-indigo-100 bg-indigo-50 p-2 text-sm">
          <summary className="cursor-pointer font-medium text-indigo-800">
            Lägg till befintliga elever ({availableExistingStudents.length} möjliga)
          </summary>
          <p className="mt-2 text-xs text-indigo-800">
            Välj elev-ID:n här om en elev redan finns i en annan klass. Namnlistan ovan skapar alltid nya elever.
          </p>
          {availableExistingStudents.length > 0 ? (
            <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded bg-white p-2">
              {availableExistingStudents.map(student => (
                <label key={student.studentId} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedExistingStudentIds.includes(student.studentId)}
                    onChange={() => toggleExistingStudent(student.studentId)}
                  />
                  <span>{student.name}</span>
                  <span className="font-mono text-gray-400">{student.studentId}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-gray-500">Alla kända elever finns redan i den valda klassen.</p>
          )}
          <button
            type="button"
            disabled={selectedExistingStudentIds.length === 0}
            onClick={() => runRosterAction(async () => {
              const saved = await onAddExistingStudentsToClass(selectedExistingStudentIds)
              if (saved) setSelectedExistingStudentIds([])
            })}
            className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            Lägg till {selectedExistingStudentIds.length || ''} vald(a) elev(er)
          </button>
        </details>
      ) : null}
      {classes.length > 1 && onMoveStudent ? (
        <details className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm">
          <summary className="cursor-pointer font-medium text-amber-900">Flytta elev till annan klass</summary>
          <p className="mt-2 text-xs text-amber-900">Elevens ID och träningshistorik följer med. Eleven tas bort från den valda källklassen.</p>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
            <select value={moveFromClassId} onChange={event => { setMoveFromClassId(event.target.value); setMoveStudentId('') }} className="rounded border px-2 py-1 text-xs">
              <option value="">Från klass</option>
              {classes.map(item => <option key={`move-from-${item.id}`} value={item.id}>{classLabel(item)}</option>)}
            </select>
            <select value={moveStudentId} onChange={event => setMoveStudentId(event.target.value)} disabled={!moveFromClassId} className="rounded border px-2 py-1 text-xs disabled:bg-gray-100">
              <option value="">Välj elev</option>
              {movableStudents.map(student => <option key={`move-student-${student.studentId}`} value={student.studentId}>{student.name} · {student.studentId}</option>)}
            </select>
            <select value={moveToClassId} onChange={event => setMoveToClassId(event.target.value)} className="rounded border px-2 py-1 text-xs">
              <option value="">Till klass</option>
              {classes.filter(item => item.id !== moveFromClassId).map(item => <option key={`move-to-${item.id}`} value={item.id}>{classLabel(item)}</option>)}
            </select>
          </div>
          <button type="button" disabled={!moveFromClassId || !moveToClassId || !moveStudentId} onClick={() => runRosterAction(async () => {
            const moved = await onMoveStudent(moveStudentId, moveFromClassId, moveToClassId)
            if (moved) { setMoveStudentId(''); setMoveToClassId('') }
          })} className="mt-2 rounded bg-amber-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">Flytta elev</button>
        </details>
      ) : null}
      <p className="text-xs text-gray-500 mb-2">
        Tips: klass-/gruppurval för alla vyer styrs längst upp på sidan.
      </p>
      {names.length > 0 && (
        <details className="text-sm mb-3" open>
          <summary>{names.length} elever i listan — kontrollera före sparning</summary>
          <ol className="list-decimal pl-6 max-h-48 overflow-auto">
            {names.map((name, index) => <li key={index}>{name}</li>)}
          </ol>
        </details>
      )}
      <p role="status" className="text-xs text-gray-600 mb-3">{busy ? 'Sparar på servern…' : classStatus || ' '}</p>

      {classes.length > 0 ? (
        <div className="space-y-1.5">
          {classes.map(item => {
            const classStudents = students.filter(student => recordMatchesClassFilter(student, [item.id]))
            const loggedInCount = classStudents.filter(student => student.auth?.lastLoginAt).length
            return (
              <div key={item.id} className="border rounded px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{classLabel(item)}</p>
                    <p className="text-xs text-gray-500">
                      Klass-ID: {item.id} · {classStudents.length} elever | {loggedInCount} har loggat in
                    </p>
                  </div>
                  {item.loginToken && <>
                    <button onClick={() => setQrClass(item)} className="px-2 py-1 bg-slate-800 hover:bg-slate-950 text-white rounded text-xs">Visa QR-kod</button>
                    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/?class=${item.loginToken}`)} className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-xs">Kopiera elevlänk</button>
                  </>}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
      </fieldset>
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Grupper</h2>
        <TeacherGroupsPanel students={students} onStatusChange={onStatusChange} />
      </div>
      {qrClass && <ClassLoginQrDialog classRecord={qrClass} onClose={() => setQrClass(null)} />}
    </div>
  )
}
