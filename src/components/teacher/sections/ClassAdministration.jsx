import { useState } from 'react'
import { NewSchoolForm, SchoolSelect, useSchools } from './SchoolControls'
import SchoolYearRollover from './SchoolYearRollover'
import { apiFetch, getTogglableExtras } from './adminApi'

export default function ClassesTab({ classes, teachers, onRefresh, setStatus }) {
  const directory = useSchools()
  const [schoolId, setSchoolId] = useState('')
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const extras = getTogglableExtras()

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    const { ok, data } = await apiFetch('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim(), schoolId })
    })
    setBusy(false)
    if (ok) { setStatus(`✓ Klass "${newName}" skapad`); setNewName(''); onRefresh() }
    else setStatus(data?.error || 'Kunde inte skapa klass')
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Ta bort klass "${name}"?`)) return
    const { ok } = await apiFetch(`/api/admin/classes/${id}`, { method: 'DELETE' })
    if (ok) { setStatus('✓ Klass borttagen'); onRefresh() }
    else setStatus('Kunde inte ta bort klass')
  }

  return (
    <div className="space-y-4">
      <NewSchoolForm directory={directory} onCreated={setSchoolId} />
      <SchoolSelect schools={directory.schools} value={schoolId} onChange={setSchoolId}
        disabled={directory.loading || Boolean(directory.error)} label="Skola för ny klass/grupp" />
      <form onSubmit={handleCreate} className="flex gap-2 items-end text-xs border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Ny klass</label>
          <input required placeholder="Klassnamn (t.ex. 4A)" value={newName}
            onChange={e => setNewName(e.target.value)}
            className="border rounded px-2 py-1.5 w-full" />
        </div>
        <button disabled={busy} type="submit"
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold text-xs disabled:opacity-50">
          {busy ? '...' : 'Skapa'}
        </button>
      </form>

      <SchoolYearRollover schools={directory.schools} onCompleted={onRefresh} setStatus={setStatus} />

      <div className="space-y-2">
        {classes.length === 0 && <p className="text-xs text-gray-400">Inga klasser ännu.</p>}
        {classes.map(c => (
          <ClassRow key={c.id} classRecord={c} teachers={teachers} extras={extras} directory={directory}
            onDelete={handleDelete} onRefresh={onRefresh} setStatus={setStatus} />
        ))}
      </div>
    </div>
  )
}

function ClassRow({ classRecord, teachers, extras, directory, onDelete, onRefresh, setStatus }) {
  const [schoolId, setSchoolId] = useState(classRecord.schoolId || '')
  const [open, setOpen] = useState(false)
  const [teacherIds, setTeacherIds] = useState(classRecord.teacherIds || [])
  const [enabledExtras, setEnabledExtras] = useState(classRecord.enabledExtras || [])
  const [busy, setBusy] = useState(false)

  const teacherNames = (classRecord.teacherIds || [])
    .map(id => teachers.find(t => t.id === id)?.displayName || id)
    .join(', ') || '—'

  const handleSave = async () => {
    setBusy(true)
    const { ok } = await apiFetch(`/api/admin/classes/${classRecord.id}`, {
      method: 'PUT',
      body: JSON.stringify({ teacherIds, enabledExtras, schoolId })
    })
    setBusy(false)
    if (ok) { setStatus('✓ Klass uppdaterad'); setOpen(false); onRefresh() }
    else setStatus('Kunde inte uppdatera klass')
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
      >
        <div>
          <span className="text-sm font-semibold text-gray-800">{classRecord.name}</span>
          <span className="text-xs text-gray-500 ml-2">ID: {classRecord.id} · {directory.schools.find(school => school.id === classRecord.schoolId)?.name || 'Skola ej angiven'} · {teacherNames}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onDelete(classRecord.id, classRecord.name) }}
            className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs">
            Ta bort
          </button>
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-3 text-xs">
          <SchoolSelect schools={directory.schools} value={schoolId} onChange={setSchoolId}
            disabled={busy || directory.loading || Boolean(directory.error)} />
          <div>
            <p className="font-semibold text-gray-600 mb-1">Tilldelade lärare</p>
            <div className="flex flex-wrap gap-2">
              {teachers.map(t => (
                <label key={t.id} className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={teacherIds.includes(t.id)}
                    onChange={e => setTeacherIds(prev =>
                      e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                    )} />
                  {t.displayName || t.username}
                </label>
              ))}
              {teachers.length === 0 && <span className="text-gray-400">Skapa lärare först</span>}
            </div>
          </div>

          {extras.length > 0 && (
            <div>
              <p className="font-semibold text-gray-600 mb-1">Extra räknesätt</p>
              <p className="text-gray-500 text-[10px] mb-2">
                +-×÷ är alltid aktiverade. Välj vilka extra räknesätt klassen ska träna.
              </p>
              <div className="flex flex-wrap gap-2">
                {extras.map(ex => (
                  <label key={ex.id} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={enabledExtras.includes(ex.id)}
                      onChange={e => setEnabledExtras(prev =>
                        e.target.checked ? [...prev, ex.id] : prev.filter(id => id !== ex.id)
                      )} />
                    {ex.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={busy}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold disabled:opacity-50">
              {busy ? '...' : 'Spara'}
            </button>
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-gray-100 rounded text-xs">
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
