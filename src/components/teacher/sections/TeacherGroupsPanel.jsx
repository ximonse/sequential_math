import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createTeacherGroup,
  deleteTeacherGroup,
  loadTeacherGroups,
  updateTeacherGroup
} from './teacherGroupsApi'

const studentIdOf = student => String(student?.studentId || student?.id || '').trim().toUpperCase()

export default function TeacherGroupsPanel({ students = [], onStatusChange }) {
  const [groups, setGroups] = useState([])
  const [teachers, setTeachers] = useState([])
  const [editingId, setEditingId] = useState('')
  const [name, setName] = useState('')
  const [pupilIds, setPupilIds] = useState([])
  const [teacherIds, setTeacherIds] = useState([])
  const [busy, setBusy] = useState(false)

  const studentById = useMemo(() => new Map(students.map(student => [studentIdOf(student), student])), [students])
  const teacherById = useMemo(() => new Map(teachers.map(teacher => [String(teacher.id), teacher])), [teachers])

  const refresh = useCallback(async () => {
    try {
      const data = await loadTeacherGroups()
      setGroups(Array.isArray(data.groups) ? data.groups : [])
      setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
    } catch (error) {
      onStatusChange?.(error.message)
    }
  }, [onStatusChange])

  useEffect(() => { void refresh() }, [refresh])

  const reset = () => {
    setEditingId('')
    setName('')
    setPupilIds([])
    setTeacherIds([])
  }

  const toggle = (setter, id) => setter(previous => (
    previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]
  ))

  const beginEdit = group => {
    setEditingId(group.id)
    setName(group.name)
    setPupilIds(group.pupilIds || [])
    setTeacherIds(group.teacherIds || [])
  }

  const save = async event => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload = { name, pupilIds, teacherIds }
      if (editingId) await updateTeacherGroup({ id: editingId, ...payload })
      else await createTeacherGroup(payload)
      onStatusChange?.(editingId ? 'Gruppen är uppdaterad.' : 'Gruppen är skapad.')
      reset()
      await refresh()
    } catch (error) {
      onStatusChange?.(error.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async group => {
    if (!window.confirm(`Ta bort gruppen ${group.name}?`)) return
    setBusy(true)
    try {
      await deleteTeacherGroup(group.id)
      if (editingId === group.id) reset()
      onStatusChange?.('Gruppen är borttagen.')
      await refresh()
    } catch (error) {
      onStatusChange?.(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Grupper består av elever på samma skola. En delad lärare måste redan ha åtkomst till alla elever.
      </p>

      <form onSubmit={save} className="rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-56 text-sm font-medium text-gray-700">
            Gruppnamn
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              maxLength={100}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy || !name.trim() || pupilIds.length === 0}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {editingId ? 'Spara grupp' : 'Skapa grupp'}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="rounded bg-gray-100 px-4 py-2 text-sm text-gray-700">
              Avbryt
            </button>
          ) : null}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-800">Elever</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-56 overflow-y-auto">
            {students.map(student => {
              const id = studentIdOf(student)
              return (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pupilIds.includes(id)} onChange={() => toggle(setPupilIds, id)} />
                  <span>{student.name || id}</span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {teachers.length > 1 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-800">Dela med lärare</legend>
            <div className="flex flex-wrap gap-3">
              {teachers.map(teacher => (
                <label key={teacher.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={teacherIds.includes(String(teacher.id))}
                    onChange={() => toggle(setTeacherIds, String(teacher.id))}
                  />
                  <span>{teacher.displayName}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {groups.map(group => (
          <article key={group.id} className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900">{group.name}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {(group.pupilIds || []).map(id => studentById.get(id)?.name || id).join(', ') || 'Inga elever'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Lärare: {(group.teacherIds || []).map(id => teacherById.get(String(id))?.displayName || id).join(', ') || 'Ingen'}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => beginEdit(group)} className="rounded bg-gray-100 px-3 py-1 text-xs">
                Redigera
              </button>
              <button type="button" disabled={busy} onClick={() => void remove(group)} className="rounded bg-red-50 px-3 py-1 text-xs text-red-700">
                Ta bort
              </button>
            </div>
          </article>
        ))}
        {groups.length === 0 ? <p className="text-sm text-gray-500">Inga grupper skapade ännu.</p> : null}
      </div>
    </div>
  )
}
