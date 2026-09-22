import { useMemo, useState } from 'react'
import { isTeacherSuperAdmin } from '../../../lib/teacherAuth'
import { NewSchoolForm, SchoolSelect, useSchools } from './SchoolControls'
import SchoolYearRollover from './SchoolYearRollover'
import { apiFetch, getTogglableExtras } from './adminApi'

export default function ClassesTab({ classes, teachers, onRefresh, setStatus }) {
  const directory = useSchools()
  const canManageSchools = isTeacherSuperAdmin()
  const [schoolId, setSchoolId] = useState('')
  const [newName, setNewName] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [busy, setBusy] = useState(false)
  const extras = getTogglableExtras()
  const visibleClasses = useMemo(
    () => classes.filter(classRecord => showArchived || !classRecord.archived),
    [classes, showArchived]
  )

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    const { ok, data } = await apiFetch('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim(), schoolId })
    })
    setBusy(false)
    if (ok) {
      setStatus('✓ Klass "' + newName + '" skapad')
      setNewName('')
      onRefresh()
    } else setStatus(data?.error || 'Kunde inte skapa klass')
  }

  const updateLifecycle = async (classRecord, action) => {
    const messages = {
      archive: ['Arkivera klassen "' + classRecord.name + '"?', '✓ Klass arkiverad'],
      restore: ['Återställ klassen "' + classRecord.name + '"?', '✓ Klass återställd'],
      delete: ['Radera den arkiverade klassen "' + classRecord.name + '" permanent?', '✓ Klass permanent raderad']
    }
    if (!window.confirm(messages[action][0])) return
    const method = action === 'delete' ? 'DELETE' : 'PUT'
    const body = action === 'delete' ? undefined : JSON.stringify({ [action]: true })
    const { ok, data } = await apiFetch('/api/admin/classes/' + classRecord.id, { method, body })
    if (ok) {
      setStatus(messages[action][1])
      onRefresh()
    } else setStatus(data?.error || 'Kunde inte ändra klassen')
  }

  return (
    <div className="space-y-4">
      {canManageSchools && <NewSchoolForm directory={directory} onCreated={setSchoolId} />}
      <SchoolSelect schools={directory.schools} value={schoolId} onChange={setSchoolId}
        disabled={directory.loading || Boolean(directory.error)} label="Skola för ny klass" />
      <form onSubmit={handleCreate} className="flex items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
        <div className="flex-1">
          <label className="mb-1 block font-semibold text-gray-600">Ny klass</label>
          <input required placeholder="Klassnamn (t.ex. 4A)" value={newName}
            onChange={event => setNewName(event.target.value)} className="w-full rounded border px-2 py-1.5" />
        </div>
        <button disabled={busy} type="submit" className="rounded bg-indigo-600 px-4 py-1.5 font-semibold text-white disabled:opacity-50">
          {busy ? '...' : 'Skapa'}
        </button>
      </form>

      <SchoolYearRollover schools={directory.schools} onCompleted={onRefresh} setStatus={setStatus} />

      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />
        Visa arkiverade klasser
      </label>
      <div className="space-y-2">
        {visibleClasses.length === 0 && <p className="text-xs text-gray-400">Inga klasser att visa.</p>}
        {visibleClasses.map(classRecord => (
          <ClassRow key={classRecord.id} classRecord={classRecord} teachers={teachers} extras={extras}
            directory={directory} canDelete={canManageSchools}
            onLifecycle={updateLifecycle} onRefresh={onRefresh} setStatus={setStatus} />
        ))}
      </div>
    </div>
  )
}

function ClassRow({ classRecord, teachers, extras, directory, canDelete, onLifecycle, onRefresh, setStatus }) {
  const [schoolId, setSchoolId] = useState(classRecord.schoolId || '')
  const [name, setName] = useState(classRecord.name || '')
  const [open, setOpen] = useState(false)
  const [teacherIds, setTeacherIds] = useState(classRecord.teacherIds || [])
  const [enabledExtras, setEnabledExtras] = useState(classRecord.enabledExtras || [])
  const [busy, setBusy] = useState(false)
  const teacherNames = (classRecord.teacherIds || [])
    .map(id => teachers.find(teacher => teacher.id === id)?.displayName || id).join(', ') || '—'

  const handleSave = async () => {
    setBusy(true)
    const { ok, data } = await apiFetch('/api/admin/classes/' + classRecord.id, {
      method: 'PUT',
      body: JSON.stringify({ name, teacherIds, enabledExtras, schoolId })
    })
    setBusy(false)
    if (ok) {
      setStatus('✓ Klass uppdaterad')
      setOpen(false)
      onRefresh()
    } else setStatus(data?.error || 'Kunde inte uppdatera klassen')
  }

  return (
    <div className={'overflow-hidden rounded-lg border ' + (classRecord.archived ? 'border-gray-300 bg-gray-100 opacity-80' : 'border-gray-200')}>
      <div onClick={() => setOpen(current => !current)}
        className="flex cursor-pointer items-center justify-between bg-gray-50 px-3 py-2 hover:bg-gray-100">
        <div>
          <span className="text-sm font-semibold text-gray-800">{classRecord.name}</span>
          {classRecord.archived && <span className="ml-2 rounded bg-gray-300 px-1.5 py-0.5 text-[10px]">Arkiverad</span>}
          <span className="ml-2 text-xs text-gray-500">
            ID: {classRecord.id} · {directory.schools.find(school => school.id === classRecord.schoolId)?.name || 'Skola ej angiven'} · {teacherNames}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {classRecord.archived ? (
            <>
              <button onClick={event => { event.stopPropagation(); onLifecycle(classRecord, 'restore') }}
                className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100">Återställ</button>
              {canDelete && <button onClick={event => { event.stopPropagation(); onLifecycle(classRecord, 'delete') }}
                className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700 hover:bg-red-100">Radera permanent</button>}
            </>
          ) : (
            <button onClick={event => { event.stopPropagation(); onLifecycle(classRecord, 'archive') }}
              className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100">Arkivera</button>
          )}
          <span className="text-xs text-gray-400">{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && (
        <div className="space-y-3 p-3 text-xs">
          <label className="block"><span className="mb-1 block font-semibold text-gray-600">Klassnamn</span>
            <input value={name} onChange={event => setName(event.target.value)} className="w-full rounded border px-2 py-1.5" />
          </label>
          <SchoolSelect schools={directory.schools} value={schoolId} onChange={setSchoolId}
            disabled={busy || directory.loading || Boolean(directory.error)} />
          <div>
            <p className="mb-1 font-semibold text-gray-600">Tilldelade lärare</p>
            <div className="flex flex-wrap gap-2">
              {teachers.map(teacher => (
                <label key={teacher.id} className="flex cursor-pointer items-center gap-1">
                  <input type="checkbox" checked={teacherIds.includes(teacher.id)}
                    onChange={event => setTeacherIds(current => event.target.checked
                      ? [...current, teacher.id] : current.filter(id => id !== teacher.id))} />
                  {teacher.displayName || teacher.username}
                </label>
              ))}
              {teachers.length === 0 && <span className="text-gray-400">Skapa lärare först</span>}
            </div>
          </div>
          {extras.length > 0 && (
            <div>
              <p className="mb-1 font-semibold text-gray-600">Extra räknesätt</p>
              <div className="flex flex-wrap gap-2">
                {extras.map(extra => (
                  <label key={extra.id} className="flex cursor-pointer items-center gap-1">
                    <input type="checkbox" checked={enabledExtras.includes(extra.id)}
                      onChange={event => setEnabledExtras(current => event.target.checked
                        ? [...current, extra.id] : current.filter(id => id !== extra.id))} />
                    {extra.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={busy}
              className="rounded bg-indigo-600 px-4 py-1.5 font-semibold text-white disabled:opacity-50">{busy ? '...' : 'Spara'}</button>
            <button onClick={() => setOpen(false)} className="rounded bg-gray-100 px-3 py-1.5">Avbryt</button>
          </div>
        </div>
      )}
    </div>
  )
}
