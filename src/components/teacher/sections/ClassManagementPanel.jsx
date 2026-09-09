import { useRef, useState } from 'react'
import { listDomains } from '../../../domains/registry'
import { parseRosterLines } from '../../../lib/storageClassHelpers'

function getTogglableExtras() {
  return listDomains()
    .filter(d => d.id !== 'arithmetic')
    .flatMap(d =>
      Array.isArray(d.skills)
        ? d.skills.map(s => ({ id: s.id, label: s.label }))
        : [{ id: d.id, label: d.label }]
    )
}

function ClassExtrasRow({ classRecord, onSaveExtras }) {
  const [open, setOpen] = useState(false)
  const [extras, setExtras] = useState(classRecord.enabledExtras || [])
  const [highscoreGroup, setHighscoreGroup] = useState(classRecord.highscoreGroup || '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const toggleableExtras = getTogglableExtras()

  const handleSave = async () => {
    setBusy(true)
    let ok = false
    try { ok = await onSaveExtras(classRecord.id, extras, { highscoreGroup }) }
    finally { setBusy(false) }
    if (!ok) return
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setOpen(false)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-indigo-600 hover:underline ml-2"
      >
        {open ? 'Stäng' : 'Inställningar ▾'}
      </button>
      {open && (
        <div className="mt-2 p-2 bg-indigo-50 rounded text-xs space-y-2">
          <p className="text-gray-500 mb-1">+-×÷ är alltid på. Välj extra räknesätt:</p>
          {toggleableExtras.map(ex => (
            <label key={ex.id} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={extras.includes(ex.id)}
                onChange={e => setExtras(prev =>
                  e.target.checked ? [...prev, ex.id] : prev.filter(id => id !== ex.id)
                )}
              />
              {ex.label}
            </label>
          ))}
          <div className="pt-2 border-t border-indigo-200">
            <label className="block text-gray-600 mb-1">Highscore-grupp</label>
            <input
              type="text"
              value={highscoreGroup}
              onChange={e => setHighscoreGroup(e.target.value)}
              placeholder="Lämna tomt = egen lista"
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            />
            <p className="text-gray-400 mt-0.5">Klasser med samma namn delar highscore-lista</p>
          </div>
          <button
            onClick={handleSave}
            disabled={busy}
            className="mt-1 px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            {saved ? '✓ Sparat' : busy ? '...' : 'Spara'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function ClassManagementPanel({
  classNameInput,
  onSetClassNameInput,
  onCreateClass,
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
  onDeleteClass,
  onRenameClass,
  onSaveClassExtras,
  onMoveStudent
}) {
  const [busy, setBusy] = useState(false)
  const [selectedExistingStudentIds, setSelectedExistingStudentIds] = useState([])
  const [moveFromClassId, setMoveFromClassId] = useState('')
  const [moveToClassId, setMoveToClassId] = useState('')
  const [moveStudentId, setMoveStudentId] = useState('')
  const busyRef = useRef(false)
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
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Klasser</h2>
      <fieldset disabled={busy} aria-busy={busy}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <input
          type="text"
          value={classNameInput}
          onChange={(event) => onSetClassNameInput(event.target.value)}
          placeholder="Klassnamn, t.ex. 4A"
          className="px-3 py-2 border rounded text-sm"
        />
        <button
          onClick={() => runRosterAction(onCreateClass)}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Skapa klass från listan
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <select
          value={addToClassId}
          onChange={(event) => onSetAddToClassId(event.target.value)}
          className="px-3 py-2 border rounded text-sm"
        >
          <option value="">Välj klass att lägga till i</option>
          {classes.map(item => (
            <option key={`add-${item.id}`} value={item.id}>
              {item.name}
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
        En elev per rad, eller separera med kommatecken eller semikolon. Förnamn räcker. Varje post skapar en ny elev med ett eget inloggnings-ID, även om namnet redan finns. Startlösenordet är elevens namn.
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
              {classes.map(item => <option key={`move-from-${item.id}`} value={item.id}>{item.name}</option>)}
            </select>
            <select value={moveStudentId} onChange={event => setMoveStudentId(event.target.value)} disabled={!moveFromClassId} className="rounded border px-2 py-1 text-xs disabled:bg-gray-100">
              <option value="">Välj elev</option>
              {movableStudents.map(student => <option key={`move-student-${student.studentId}`} value={student.studentId}>{student.name} · {student.studentId}</option>)}
            </select>
            <select value={moveToClassId} onChange={event => setMoveToClassId(event.target.value)} className="rounded border px-2 py-1 text-xs">
              <option value="">Till klass</option>
              {classes.filter(item => item.id !== moveFromClassId).map(item => <option key={`move-to-${item.id}`} value={item.id}>{item.name}</option>)}
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
                    <p className="text-sm font-medium text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {classStudents.length} elever | {loggedInCount} har loggat in
                    </p>
                  </div>
                  <button
                    onClick={() => runRosterAction(() => onDeleteClass(item.id))}
                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                  >
                    Ta bort klass
                  </button>
                  <button onClick={() => { const name = window.prompt('Nytt klassnamn:', item.name); if (name?.trim()) onRenameClass(item.id, name) }} className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs">Byt namn</button>
                </div>
                {onSaveClassExtras && (
                  <ClassExtrasRow classRecord={item} onSaveExtras={onSaveClassExtras} />
                )}
              </div>
            )
          })}
        </div>
      ) : null}
      </fieldset>
    </div>
  )
}
