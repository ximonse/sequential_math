import { useState } from 'react'
import { listDomains } from '../../../domains/registry'
import { STANDARD_OPERATIONS } from '../../../lib/operations'

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
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const toggleableExtras = getTogglableExtras()

  const handleSave = async () => {
    setBusy(true)
    await onSaveExtras(classRecord.id, extras)
    setBusy(false)
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
        {open ? 'Stäng' : 'Räknesätt ▾'}
      </button>
      {open && (
        <div className="mt-2 p-2 bg-indigo-50 rounded text-xs space-y-1">
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
  onAddStudentsToClass,
  rosterInput,
  onSetRosterInput,
  classStatus,
  students,
  recordMatchesClassFilter,
  onDeleteClass,
  onSaveClassExtras
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Klasser</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <input
          type="text"
          value={classNameInput}
          onChange={(event) => onSetClassNameInput(event.target.value)}
          placeholder="Klassnamn, t.ex. 4A"
          className="px-3 py-2 border rounded text-sm"
        />
        <button
          onClick={onCreateClass}
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
          onClick={onAddStudentsToClass}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm"
        >
          Lägg till elever i vald klass
        </button>
      </div>
      <textarea
        value={rosterInput}
        onChange={(event) => onSetRosterInput(event.target.value)}
        placeholder={'Klistra in elevlista, en per rad\\nAnna Andersson\\nBo Berg'}
        className="w-full min-h-28 px-3 py-2 border rounded text-sm mb-3"
      />
      <p className="text-xs text-gray-500 mb-2">
        Inloggningsnamn skapas från elevens namn. Startlösenord sätts till elevens namn.
      </p>
      <p className="text-xs text-gray-500 mb-2">
        En elev kan vara med i flera klasser/grupper samtidigt.
      </p>
      <p className="text-xs text-gray-500 mb-2">
        Tips: klass-/gruppurval för alla vyer styrs längst upp på sidan.
      </p>
      <p className="text-xs text-gray-600 mb-3">{classStatus || ' '}</p>

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
                    onClick={() => onDeleteClass(item.id)}
                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                  >
                    Ta bort klass
                  </button>
                </div>
                {onSaveClassExtras && (
                  <ClassExtrasRow classRecord={item} onSaveExtras={onSaveClassExtras} />
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
