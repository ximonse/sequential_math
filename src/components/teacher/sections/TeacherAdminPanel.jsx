/**
 * Admin-panel för att hantera lärarkonton och klasser.
 * Visas bara för adminanvändare (isAdmin === true).
 */
import { useEffect, useState } from 'react'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import { listDomains } from '../../../domains/registry'

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-teacher-token': getTeacherApiToken()
  }
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// Hämtar lista på togglable extras från domän-registret (allt utom arithmetic)
function getTogglableExtras() {
  return listDomains()
    .filter(d => d.id !== 'arithmetic')
    .flatMap(d =>
      Array.isArray(d.skills)
        ? d.skills.map(s => ({ id: s.id, label: s.label, domainLabel: d.label }))
        : [{ id: d.id, label: d.label, domainLabel: d.label }]
    )
}

export default function TeacherAdminPanel() {
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [status, setStatus] = useState('')
  const [activeTab, setActiveTab] = useState('teachers')

  const load = async () => {
    const [ta, ca] = await Promise.all([
      apiFetch('/api/admin/teachers'),
      apiFetch('/api/admin/classes')
    ])
    if (ta.ok) setTeachers(ta.data.teachers || [])
    if (ca.ok) setClasses(ca.data.classes || [])
  }

  useEffect(() => { load() }, [])

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Administration</h2>
        <div className="flex gap-2">
          {['teachers', 'classes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'teachers' ? 'Lärare' : 'Klasser'}
            </button>
          ))}
        </div>
      </div>

      {status && (
        <div className={`mb-3 px-3 py-2 rounded text-xs ${
          status.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status}
        </div>
      )}

      {activeTab === 'teachers' && (
        <TeachersTab
          teachers={teachers}
          classes={classes}
          onRefresh={load}
          setStatus={setStatus}
        />
      )}
      {activeTab === 'classes' && (
        <ClassesTab
          classes={classes}
          teachers={teachers}
          onRefresh={load}
          setStatus={setStatus}
        />
      )}
    </div>
  )
}

// ── Lärare-flik ───────────────────────────────────────────────────────────────

function TeachersTab({ teachers, classes, onRefresh, setStatus }) {
  const [form, setForm] = useState({ username: '', displayName: '', password: '', isAdmin: false, classIds: [] })
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
      setForm({ username: '', displayName: '', password: '', isAdmin: false, classIds: [] })
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
          <label className="text-xs text-gray-600">Tilldela klasser:</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {classes.map(c => (
              <label key={c.id} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.classIds.includes(c.id)}
                  onChange={e => setForm(f => ({
                    ...f,
                    classIds: e.target.checked
                      ? [...f.classIds, c.id]
                      : f.classIds.filter(id => id !== c.id)
                  }))}
                />
                {c.name}
              </label>
            ))}
          </div>
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
              <th className="py-1 pr-2">Klasser</th>
              <th className="py-1 pr-2">Admin</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 && (
              <tr><td colSpan={5} className="py-2 text-gray-400">Inga lärarkonton ännu.</td></tr>
            )}
            {teachers.map(t => (
              <TeacherRow key={t.id} teacher={t} classes={classes} onDelete={handleDelete} onRefresh={onRefresh} setStatus={setStatus} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TeacherRow({ teacher, classes, onDelete, onRefresh, setStatus }) {
  const [editing, setEditing] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [classIds, setClassIds] = useState(teacher.classIds || [])
  const [busy, setBusy] = useState(false)

  const classNames = (teacher.classIds || [])
    .map(id => classes.find(c => c.id === id)?.name || id)
    .join(', ') || '—'

  const handleSave = async () => {
    setBusy(true)
    const body = { classIds }
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
              {classes.map(c => (
                <label key={c.id} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input type="checkbox" checked={classIds.includes(c.id)}
                    onChange={e => setClassIds(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} />
                  {c.name}
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
      <td className="py-1 pr-2 text-gray-600">{classNames}</td>
      <td className="py-1 pr-2">{teacher.isAdmin ? '✓' : ''}</td>
      <td className="py-1 flex gap-1">
        <button onClick={() => setEditing(true)} className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs">Redigera</button>
        <button onClick={() => onDelete(teacher.id, teacher.username)} className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 rounded text-xs">Ta bort</button>
      </td>
    </tr>
  )
}

// ── Klasser-flik ──────────────────────────────────────────────────────────────

function ClassesTab({ classes, teachers, onRefresh, setStatus }) {
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const extras = getTogglableExtras()

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setBusy(true)
    const { ok, data } = await apiFetch('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify({ name: newName.trim() })
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

      <div className="space-y-2">
        {classes.length === 0 && <p className="text-xs text-gray-400">Inga klasser ännu.</p>}
        {classes.map(c => (
          <ClassRow key={c.id} classRecord={c} teachers={teachers} extras={extras}
            onDelete={handleDelete} onRefresh={onRefresh} setStatus={setStatus} />
        ))}
      </div>
    </div>
  )
}

function ClassRow({ classRecord, teachers, extras, onDelete, onRefresh, setStatus }) {
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
      body: JSON.stringify({ teacherIds, enabledExtras })
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
          <span className="text-xs text-gray-500 ml-2">{teacherNames}</span>
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
