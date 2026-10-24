import { useState } from 'react'
import { parseRosterLines } from '../../../lib/storageClassHelpers'

// Adds new or existing pupils to the open class and moves pupils out of it.
export default function ClassPupilsTab({
  classRecord,
  classes,
  students,
  classStudents,
  recordMatchesClassFilter,
  rosterInput,
  onSetRosterInput,
  onAddStudentsToClass,
  onAddExistingStudentsToClass,
  onMoveStudent,
  onOpenStudentDetail,
  onCredentials,
  runAction
}) {
  const [selectedExistingStudentIds, setSelectedExistingStudentIds] = useState([])
  const [moveStudentId, setMoveStudentId] = useState('')
  const [moveToClassId, setMoveToClassId] = useState('')
  const names = parseRosterLines(rosterInput)
  const classNameOf = student => classes.find(item => recordMatchesClassFilter(student, [item.id]))?.name || 'Ingen klass'
  const availableExistingStudents = students.filter(student => !recordMatchesClassFilter(student, [classRecord.id]))
  const otherClasses = classes.filter(item => item.id !== classRecord.id && !item.archived)
  const toggleExistingStudent = studentId => setSelectedExistingStudentIds(previous => (
    previous.includes(studentId) ? previous.filter(id => id !== studentId) : [...previous, studentId]
  ))

  return (
    <div className="space-y-3 text-sm">
      <section aria-labelledby="new-pupils-title" className="rounded border border-emerald-200 bg-emerald-50 p-3">
        <h4 id="new-pupils-title" className="font-semibold text-emerald-900">Nya elever</h4>
        <textarea aria-label="Elevlista" value={rosterInput} onChange={event => onSetRosterInput(event.target.value)}
          placeholder={'En elev per rad, eller med kommatecken\nAnna Andersson\nBo Berg'}
          className="mt-2 block min-h-24 w-full rounded border bg-white px-3 py-2 text-sm" />
        <p className="mt-1 text-xs text-emerald-900">Namnen måste vara unika i klassen. Varje ny elev får ett elevkort; hämta korten direkt efteråt.</p>
        {names.length > 0 && <details className="mt-2 text-xs" open><summary>{names.length} elever i listan, kontrollera före sparning</summary>
          <ol className="max-h-40 list-decimal overflow-auto pl-6">{names.map((name, index) => <li key={index}>{name}</li>)}</ol></details>}
        <button type="button" disabled={names.length === 0}
          onClick={() => runAction(async () => onCredentials((await onAddStudentsToClass())?.credentials))}
          className="mt-2 rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700 disabled:opacity-50 font-semibold">
          Lägg till elever i {classRecord.name}
        </button>
      </section>

      {onAddExistingStudentsToClass && availableExistingStudents.length > 0 && (
        <details className="rounded border border-indigo-100 bg-indigo-50 p-2">
          <summary className="cursor-pointer font-medium text-indigo-800">Lägg till befintliga elever ({availableExistingStudents.length} möjliga)</summary>
          <p className="mt-2 text-xs text-indigo-800">För elever som redan går i en annan klass.</p>
          <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded bg-white p-2">
            {availableExistingStudents.map(student => <label key={student.studentId} className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={selectedExistingStudentIds.includes(student.studentId)} onChange={() => toggleExistingStudent(student.studentId)} />
              <span>{student.name || student.displayAlias}</span><span className="text-gray-400">{classNameOf(student)}</span>
            </label>)}
          </div>
          <button type="button" disabled={selectedExistingStudentIds.length === 0} onClick={() => runAction(async () => {
            const saved = await onAddExistingStudentsToClass(selectedExistingStudentIds)
            if (saved) setSelectedExistingStudentIds([])
          })} className="mt-2 rounded bg-indigo-600 px-3 py-1 text-xs text-white disabled:opacity-50 font-semibold">Lägg till {selectedExistingStudentIds.length || ''} vald(a) elev(er)</button>
        </details>
      )}

      {onMoveStudent && otherClasses.length > 0 && classStudents.length > 0 && (
        <details className="rounded border border-amber-200 bg-amber-50 p-2">
          <summary className="cursor-pointer font-medium text-amber-900">Flytta elev till annan klass</summary>
          <p className="mt-2 text-xs text-amber-900">Elevens träningshistorik följer med.</p>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <select aria-label="Elev att flytta" value={moveStudentId} onChange={event => setMoveStudentId(event.target.value)} className="rounded border px-1.5 py-0.5 text-xs">
              <option value="">Välj elev</option>
              {classStudents.map(student => <option key={student.studentId} value={student.studentId}>{student.name || student.displayAlias}</option>)}
            </select>
            <select aria-label="Till klass" value={moveToClassId} onChange={event => setMoveToClassId(event.target.value)} className="rounded border px-1.5 py-0.5 text-xs">
              <option value="">Till klass</option>
              {otherClasses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <button type="button" disabled={!moveToClassId || !moveStudentId} onClick={() => runAction(async () => {
            const moved = await onMoveStudent(moveStudentId, classRecord.id, moveToClassId)
            if (moved) { setMoveStudentId(''); setMoveToClassId('') }
          })} className="mt-2 rounded bg-amber-600 px-3 py-1 text-xs text-white disabled:opacity-50 font-semibold">Flytta elev</button>
        </details>
      )}

      <section aria-labelledby="class-pupils-title">
        <h4 id="class-pupils-title" className="font-semibold text-gray-800">Elever i klassen ({classStudents.length})</h4>
        {classStudents.length === 0 ? <p className="mt-1 text-xs text-gray-500">Inga elever ännu.</p> : (
          <ul className="mt-1 divide-y divide-gray-100 rounded border border-gray-200">
            {classStudents.map(student => <li key={student.studentId} data-class-pupil className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
              <span className="truncate font-medium">{student.name || student.displayAlias}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-gray-500">{student.auth?.lastLoginAt ? 'Har loggat in' : 'Inte inloggad än'}</span>
                {onOpenStudentDetail && <button type="button" onClick={() => onOpenStudentDetail(student.studentId)} className="rounded bg-slate-200 px-1.5 py-0.5">Öppna elevprofil</button>}
              </span>
            </li>)}
          </ul>
        )}
      </section>
    </div>
  )
}
