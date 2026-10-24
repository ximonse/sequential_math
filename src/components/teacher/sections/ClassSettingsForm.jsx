import { useState } from 'react'
import { SchoolSelect } from './SchoolControls'
import { apiFetch, getTogglableExtras } from './adminApi'
import { STANDARD_OPERATIONS, getOperationLabel } from '../../../lib/operations'
import { resolveClassOperations } from '../../../lib/classOperations'

// Name, school, teachers and practice settings of one class (administrators).
export default function ClassSettingsForm({ classRecord, teachers, directory, onSaved, setStatus }) {
  const [schoolId, setSchoolId] = useState(classRecord.schoolId || '')
  const [name, setName] = useState(classRecord.name || '')
  const [teacherIds, setTeacherIds] = useState(classRecord.teacherIds || [])
  const [enabledOperations, setEnabledOperations] = useState(() => resolveClassOperations(classRecord))
  const [talbildEnabled, setTalbildEnabled] = useState(classRecord.talbildEnabled === true)
  const [busy, setBusy] = useState(false)
  const extras = getTogglableExtras()

  const handleSave = async () => {
    if (enabledOperations.length === 0) {
      setStatus('Välj minst ett räknesätt för klassens vanliga träning.')
      return
    }
    if (!schoolId) {
      setStatus('Välj en skola för klassen.')
      return
    }
    setBusy(true)
    const { ok, data } = await apiFetch('/api/admin/classes/' + classRecord.id, {
      method: 'PUT',
      body: JSON.stringify({
        name, teacherIds, schoolId, enabledOperations, talbildEnabled,
        enabledExtras: enabledOperations.filter(id => !STANDARD_OPERATIONS.includes(id))
      })
    })
    setBusy(false)
    if (ok) {
      setStatus('✓ Klass uppdaterad')
      onSaved()
    } else setStatus(data?.error || 'Kunde inte uppdatera klassen')
  }

  return (
    <div className="space-y-3 text-xs">
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
      <fieldset>
        <legend className="mb-1 font-semibold text-gray-700">Räknesätt i klassens vanliga träning</legend>
        <p className="mb-2 text-gray-500">Grundräknesätten är förvalda. Uppdrag och tabellträning styrs separat.</p>
        <div className="flex flex-wrap gap-2">
          {[
            ...STANDARD_OPERATIONS.map(id => ({ id, label: getOperationLabel(id) })),
            ...extras
          ].map(operation => (
            <label key={operation.id} className="flex cursor-pointer items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
              <input type="checkbox" checked={enabledOperations.includes(operation.id)}
                onChange={event => setEnabledOperations(current => event.target.checked
                  ? [...current, operation.id] : current.filter(id => id !== operation.id))} />
              {operation.label}
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
            <input type="checkbox" checked={talbildEnabled}
              onChange={event => setTalbildEnabled(event.target.checked)} />
            Talbild (snabb taluppfattning)
          </label>
        </div>
      </fieldset>
      <button type="button" onClick={handleSave} disabled={busy}
        className="rounded bg-indigo-600 px-1.5 py-0.5 font-semibold text-white disabled:opacity-50">{busy ? 'Sparar…' : 'Spara inställningar'}</button>
    </div>
  )
}
