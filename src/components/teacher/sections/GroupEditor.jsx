import { useState } from 'react'
import { studentIdOf } from './useTeacherGroups'

export default function GroupEditor({ group, classes, students, teachers, busy, onSave }) {
  const [name, setName] = useState(group?.name || '')
  const [pupilIds, setPupilIds] = useState(group?.pupilIds || [])
  const [teacherIds, setTeacherIds] = useState(group?.teacherIds || [])
  const [search, setSearch] = useState('')
  const [classIds, setClassIds] = useState([])
  const toggle = (setter, id) => setter(previous => (
    previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]
  ))
  const query = search.trim().toLowerCase()
  const shown = students.filter(student => (
    (classIds.length === 0 || [student.classId, ...(student.classIds || [])]
      .some(id => classIds.includes(String(id)))) &&
    (!query || String(student.name || student.displayAlias || '').toLowerCase().includes(query))
  ))
  const hiddenSelectedCount = pupilIds.filter(id => !shown.some(student => studentIdOf(student) === id)).length

  const submit = event => {
    event.preventDefault()
    void onSave({ name, pupilIds, teacherIds })
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <p className="text-xs text-gray-600">Grupper består av elever på samma skola. En delad lärare måste redan ha åtkomst till alla elever.</p>
      <label className="block font-medium text-gray-700">
        Gruppnamn
        <input value={name} onChange={event => setName(event.target.value)} maxLength={100} required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5" />
      </label>
      <fieldset>
        <legend className="mb-1 font-semibold text-gray-800">Välj klasser</legend>
        <div className="flex flex-wrap gap-3">
          {classes.map(record => (
            <label key={record.id} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={classIds.includes(String(record.id))}
                onChange={() => toggle(setClassIds, String(record.id))} />
              <span>{record.name}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-600">Välj en eller flera klasser för att filtrera elevlistan. Utan klassval visas alla elever.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-1 font-semibold text-gray-800">Elever ({pupilIds.length} valda)</legend>
        {hiddenSelectedCount > 0 && <p className="mb-1 text-xs text-gray-600">{hiddenSelectedCount} valda elever är dolda av filtret. De är fortfarande med i gruppen.</p>}
        <input type="search" aria-label="Sök elev i gruppen" value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Sök elev …" className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-xs" />
        <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {shown.length === 0 && <p className="text-xs text-gray-500">Inga elever matchar filtret.</p>}
          {shown.map(student => {
            const id = studentIdOf(student)
            return (
              <label key={id} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={pupilIds.includes(id)} onChange={() => toggle(setPupilIds, id)} />
                <span>{student.name || student.displayAlias}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
      {teachers.length > 1 && (
        <fieldset>
          <legend className="mb-1 font-semibold text-gray-800">Dela med lärare</legend>
          <div className="flex flex-wrap gap-3">
            {teachers.map(teacher => (
              <label key={teacher.id} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={teacherIds.includes(String(teacher.id))}
                  onChange={() => toggle(setTeacherIds, String(teacher.id))} />
                <span>{teacher.displayName}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <button type="submit" disabled={busy || !name.trim() || pupilIds.length === 0}
        className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-40">
        {group ? 'Spara grupp' : 'Skapa grupp'}
      </button>
    </form>
  )
}
