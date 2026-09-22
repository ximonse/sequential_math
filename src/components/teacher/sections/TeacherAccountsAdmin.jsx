import { useState } from 'react'
import { getTeacherRoleLabel } from '../../../lib/teacherRoles'
import { isTeacherSuperAdmin } from '../../../lib/teacherAuth'
import { useSchools } from './SchoolControls'
import { apiFetch } from './adminApi'

const EMPTY_FORM = { username: '', displayName: '', password: '', role: 'teacher', schoolIds: [] }

export default function TeachersTab({ teachers, onRefresh, setStatus }) {
  const directory = useSchools()
  const canManageRoles = isTeacherSuperAdmin()
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)

  const handleCreate = async (event) => {
    event.preventDefault()
    setBusy(true)
    setStatus('')
    const { ok, data } = await apiFetch('/api/admin/teachers', {
      method: 'POST',
      body: JSON.stringify({ ...form, role: canManageRoles ? form.role : 'teacher' })
    })
    setBusy(false)
    if (ok) {
      setStatus('✓ Konto "' + form.username + '" skapat')
      setForm(EMPTY_FORM)
      onRefresh()
    } else {
      setStatus(data?.error || 'Kunde inte skapa konto')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm('Ta bort kontot "' + name + '"?')) return
    const { ok, data } = await apiFetch('/api/admin/teachers/' + id, { method: 'DELETE' })
    if (ok) {
      setStatus('✓ Konto borttaget')
      onRefresh()
    } else {
      setStatus(data?.error || 'Kunde inte ta bort kontot')
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
        <h3 className="col-span-2 mb-1 font-semibold text-gray-600">Nytt konto</h3>
        <input required placeholder="Användarnamn (t.ex. anna.larare)" value={form.username}
          onChange={event => setForm(current => ({ ...current, username: event.target.value.toLowerCase() }))}
          className="col-span-2 rounded border px-2 py-1.5" />
        <input placeholder="Visningsnamn" value={form.displayName}
          onChange={event => setForm(current => ({ ...current, displayName: event.target.value }))}
          className="rounded border px-2 py-1.5" />
        <input required type="password" placeholder="Lösenord (minst 6 tecken)" value={form.password}
          onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
          className="rounded border px-2 py-1.5" />
        {canManageRoles && (
          <label className="col-span-2">
            <span className="mb-1 block text-gray-600">Roll</span>
            <select value={form.role} onChange={event => setForm(current => ({ ...current, role: event.target.value }))}
              className="w-full rounded border px-2 py-1.5">
              <option value="teacher">Lärare</option>
              <option value="school_admin">Skoladministratör</option>
              <option value="super_admin">Huvudadministratör</option>
            </select>
          </label>
        )}
        <SchoolAssignments schools={directory.schools} selected={form.schoolIds}
          onChange={schoolIds => setForm(current => ({ ...current, schoolIds }))} />
        <button disabled={busy} type="submit" className="col-span-2 rounded bg-indigo-600 py-1.5 font-semibold text-white disabled:opacity-50">
          {busy ? 'Skapar...' : 'Skapa konto'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b text-left text-gray-500">
            <th className="py-1 pr-2">Användarnamn</th><th className="py-1 pr-2">Namn</th>
            <th className="py-1 pr-2">Skolor</th><th className="py-1 pr-2">Roll</th><th className="py-1" />
          </tr></thead>
          <tbody>
            {teachers.length === 0 && <tr><td colSpan={5} className="py-2 text-gray-400">Inga konton att visa.</td></tr>}
            {teachers.map(teacher => (
              <TeacherRow key={teacher.id} teacher={teacher} schools={directory.schools}
                canManageRoles={canManageRoles} onDelete={handleDelete} onRefresh={onRefresh} setStatus={setStatus} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SchoolAssignments({ schools, selected, onChange }) {
  return (
    <div className="col-span-2">
      <p className="text-gray-600">Tilldelade skolor</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {schools.map(school => (
          <label key={school.id} className="flex cursor-pointer items-center gap-1">
            <input type="checkbox" checked={selected.includes(school.id)}
              onChange={event => onChange(event.target.checked ? [...selected, school.id] : selected.filter(id => id !== school.id))} />
            {school.name}
          </label>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-gray-500">Klassansvar väljs under Klasser.</p>
    </div>
  )
}

function TeacherRow({ teacher, schools, canManageRoles, onDelete, onRefresh, setStatus }) {
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(teacher.displayName || '')
  const [newPassword, setNewPassword] = useState('')
  const [schoolIds, setSchoolIds] = useState(teacher.schoolIds || [])
  const [role, setRole] = useState(teacher.role || 'teacher')
  const [busy, setBusy] = useState(false)
  const schoolNames = (teacher.schoolIds || []).map(id => schools.find(school => school.id === id)?.name || id).join(', ') || '—'

  const handleSave = async () => {
    setBusy(true)
    const body = { displayName, schoolIds }
    if (newPassword.length >= 6) body.password = newPassword
    if (canManageRoles) body.role = role
    const { ok, data } = await apiFetch('/api/admin/teachers/' + teacher.id, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
    setBusy(false)
    if (ok) {
      setStatus('✓ Konto uppdaterat')
      setEditing(false)
      setNewPassword('')
      onRefresh()
    } else {
      setStatus(data?.error || 'Kunde inte uppdatera kontot')
    }
  }

  if (editing) {
    return (
      <tr className="border-b bg-indigo-50"><td colSpan={5} className="space-y-2 px-1 py-2">
        <p className="font-semibold">{teacher.username}</p>
        <input value={displayName} onChange={event => setDisplayName(event.target.value)}
          className="w-full rounded border px-2 py-1" placeholder="Visningsnamn" />
        <SchoolAssignments schools={schools} selected={schoolIds} onChange={setSchoolIds} />
        {canManageRoles && (
          <select value={role} onChange={event => setRole(event.target.value)} className="w-full rounded border px-2 py-1">
            <option value="teacher">Lärare</option><option value="school_admin">Skoladministratör</option>
            <option value="super_admin">Huvudadministratör</option>
          </select>
        )}
        <input type="password" placeholder="Nytt lösenord (tomt behåller det gamla)" value={newPassword}
          onChange={event => setNewPassword(event.target.value)} className="w-full rounded border px-2 py-1" />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={busy} className="rounded bg-indigo-600 px-3 py-1 text-white disabled:opacity-50">{busy ? '...' : 'Spara'}</button>
          <button onClick={() => setEditing(false)} className="rounded bg-gray-200 px-3 py-1">Avbryt</button>
        </div>
      </td></tr>
    )
  }

  return (
    <tr className="border-b last:border-b-0 hover:bg-gray-50">
      <td className="py-1 pr-2 font-mono">{teacher.username}</td>
      <td className="py-1 pr-2">{teacher.displayName || '—'}{teacher.disabled ? <span className="ml-1 text-red-600">(spärrad)</span> : null}</td>
      <td className="py-1 pr-2 text-gray-600">{schoolNames}</td>
      <td className="py-1 pr-2">{getTeacherRoleLabel(teacher.role)}</td>
      <td className="flex gap-1 py-1">
        <button onClick={() => setEditing(true)} className="rounded bg-gray-100 px-2 py-0.5 hover:bg-gray-200">Redigera</button>
        {canManageRoles && <button onClick={() => onDelete(teacher.id, teacher.username)}
          className="rounded bg-red-50 px-2 py-0.5 text-red-700 hover:bg-red-100">Ta bort</button>}
      </td>
    </tr>
  )
}
