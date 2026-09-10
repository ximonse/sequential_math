import { useState } from 'react'
import { useSchools } from './SchoolControls'
import { apiFetch } from './adminApi'

export default function TeachersTab({ teachers, onRefresh, setStatus }) {
  const directory = useSchools()
  const [form, setForm] = useState({ username: '', displayName: '', password: '', isAdmin: false, schoolIds: [] })
  const [busy, setBusy] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setBusy(true)
    setStatus('')
    const { ok, data } = await apiFetch('/api/admin/teachers', {
      method: 'POST',
      body: JSON.stringify(form)
    })
    setBusy(false)
    if (ok) {
      setStatus(`✓ Lärare "${form.username}" skapad`)
      setForm({ username: '', displayName: '', password: '', isAdmin: false, schoolIds: [] })
      onRefresh()
    } else {
      setStatus(data?.error || 'Kunde inte skapa lärare')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Ta bort lärare "${name}"?`)) return
    const { ok } = await apiFetch(`/api/admin/teachers/${id}`, { method: 'DELETE' })
    if (ok) { setStatus(`✓ Lärare borttagen`); onRefresh() }
    else setStatus('Kunde inte ta bort lärare')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="grid grid-cols-2 gap-2 text-xs border border-gray-200 rounded-lg p-3 bg-gray-50">
        <h3 className="col-span-2 text-xs font-semibold text-gray-600 mb-1">Ny lärare</h3>
        <input
          required
          placeholder="Användarnamn (t.ex. anna.larare)"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))}
          className="col-span-2 border rounded px-2 py-1.5"
        />
        <input
          placeholder="Visningsnamn (valfritt)"
          value={form.displayName}
          onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
          className="border rounded px-2 py-1.5"
        />
        <input
          required
          type="password"
          placeholder="Lösenord (minst 6 tecken)"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          className="border rounded px-2 py-1.5"
        />
        <div className="col-span-2">
          <label className="text-xs text-gray-600">Tilldela skolor:</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {directory.schools.map(school => (
              <label key={school.id} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.schoolIds.includes(school.id)}
                  onChange={e => setForm(f => ({
                    ...f,
                    schoolIds: e.target.checked
                      ? [...f.schoolIds, school.id]
                      : f.schoolIds.filter(id => id !== school.id)
                  }))}
                />
                {school.name}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-gray-500">Klassansvar väljs under fliken Klasser.</p>
        </div>
        <label className="col-span-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.isAdmin} onChange={e => setForm(f => ({ ...f, isAdmin: e.target.checked }))} />
          Administratör (kan se alla klasser och hantera lärare)
        </label>
        <button disabled={busy} type="submit" className="col-span-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold text-xs disabled:opacity-50">
          {busy ? 'Skapar...' : 'Skapa lärare'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-1 pr-2">Användarnamn</th>
              <th className="py-1 pr-2">Namn</th>
              <th className="py-1 pr-2">Skolor</th>
              <th className="py-1 pr-2">Admin</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 && (
              <tr><td colSpan={5} className="py-2 text-gray-400">Inga lärarkonton ännu.</td></tr>
            )}
            {teachers.map(t => (
              <TeacherRow key={t.id} teacher={t} schools={directory.schools} onDelete={handleDelete} onRefresh={onRefresh} setStatus={setStatus} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TeacherRow({ teacher, schools, onDelete, onRefresh, setStatus }) {
  const [editing, setEditing] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [schoolIds, setSchoolIds] = useState(teacher.schoolIds || [])
  const [busy, setBusy] = useState(false)

  const schoolNames = (teacher.schoolIds || [])
    .map(id => schools.find(school => school.id === id)?.name || id)
    .join(', ') || '—'

  const handleSave = async () => {
    setBusy(true)
    const body = { schoolIds }
    if (newPassword.length >= 6) body.password = newPassword
    const { ok } = await apiFetch(`/api/admin/teachers/${teacher.id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
    setBusy(false)
    if (ok) { setStatus('✓ Lärare uppdaterad'); setEditing(false); setNewPassword(''); onRefresh() }
    else setStatus('Kunde inte uppdatera')
  }

  if (editing) {
    return (
      <tr className="border-b bg-indigo-50">
        <td colSpan={5} className="py-2 px-1">
          <div className="space-y-2">
            <p className="text-xs font-semibold">{teacher.username}</p>
            <div className="flex flex-wrap gap-2">
              {schools.map(school => (
                <label key={school.id} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={schoolIds.includes(school.id)}
                    onChange={e => setSchoolIds(prev => e.target.checked ? [...prev, school.id] : prev.filter(id => id !== school.id))} />
                  {school.name}
                </label>
              ))}
            </div>
            <input type="password" placeholder="Nytt lösenord (lämna tomt för oförändrat)"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="border rounded px-2 py-1 text-xs w-full" />
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={busy} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs disabled:opacity-50">{busy ? '...' : 'Spara'}</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-200 rounded text-xs">Avbryt</button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b last:border-b-0 hover:bg-gray-50">
      <td className="py-1 pr-2 font-mono">{teacher.username}</td>
      <td className="py-1 pr-2">{teacher.displayName || '—'}</td>
      <td className="py-1 pr-2 text-gray-600">{schoolNames}</td>
      <td className="py-1 pr-2">{teacher.isAdmin ? '✓' : ''}</td>
      <td className="py-1 flex gap-1">
        <button onClick={() => setEditing(true)} className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs">Redigera</button>
        <button onClick={() => onDelete(teacher.id, teacher.username)} className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs">Ta bort</button>
      </td>
    </tr>
  )
}
