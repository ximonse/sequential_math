import { useState } from 'react'
import { loadTeacherProfile } from '../../../lib/storage'
import { buildAnonymizedClassExport } from '../../../lib/localTestDataTransfer'
import { downloadTextFile } from './dashboardExportHelpers'

export default function LocalTestDataPanel({ classes = [], students = [], onImported = async () => {} }) {
  const [classId, setClassId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const selected = classes.find(item => item.id === classId)

  async function exportClass() {
    if (!selected) return
    setBusy(true)
    setMessage('Läser hela elevhistoriken…')
    try {
      const members = students.filter(student =>
        student.classId === classId || student.classIds?.includes(classId) || selected.studentIds?.includes(student.studentId)
      )
      if (members.length === 0) throw new Error('Klassen saknar synliga elever.')
      if (Array.isArray(selected.studentIds) && selected.studentIds.some(id => !members.some(member => member.studentId === id))) {
        throw new Error('Alla elever i klassen är inte synliga. Ingen ofullständig export skapades.')
      }
      const profiles = []
      for (const member of members) {
        const profile = await loadTeacherProfile(member.studentId)
        if (!profile || !Array.isArray(profile.problemLog)) {
          throw new Error('Kunde inte läsa hela historiken för alla elever. Ingen fil skapades.')
        }
        profiles.push(profile)
      }
      const data = buildAnonymizedClassExport(profiles)
      downloadTextFile(JSON.stringify(data, null, 2), `testklass_${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8')
      const incomplete = data.students.filter(student => !student.historyComplete).length
      setMessage(`${profiles.length} elever exporterade. ${incomplete ? `${incomplete} har äldre svar utanför den sparade problemloggen.` : 'All sparad historik ingår.'}`)
    } catch (error) {
      setMessage(error.message || 'Exporten misslyckades.')
    } finally {
      setBusy(false)
    }
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setMessage('Importerar en separat testklass…')
    try {
      const text = await file.text()
      if (text.length > 100_000_000) throw new Error('Filen är för stor.')
      const response = await fetch('/__local-test-class/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Importen misslyckades.')
      await onImported()
      setClassId(result.classId)
      setMessage(`Testklass skapad med ${result.studentCount} elever. Den finns bara i den här localhost-serverns minne.`)
    } catch (error) {
      setMessage(error.message || 'Importen misslyckades.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Testdata för lärarvyn">
    <h2 className="text-lg font-semibold text-slate-900">Testdata för lärarvyn</h2>
    <p className="mt-1 text-sm text-slate-600">Exportera en klass med påhittade namn och förskjutna datum. Filen innehåller sparade svar, men inga elev-ID:n eller inloggningsuppgifter.</p>
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium text-slate-800">Klass
        <select className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2" value={classId} onChange={event => setClassId(event.target.value)}>
          <option value="">Välj klass</option>
          {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <button type="button" disabled={!selected || busy} onClick={exportClass} className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Exportera vald klass som JSON</button>
      {import.meta.env.DEV && <label className="cursor-pointer rounded bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900">
        Importera testklass på localhost
        <input type="file" accept=".json,application/json" onChange={importFile} disabled={busy} className="sr-only" />
      </label>}
    </div>
    {message && <p role="status" className="mt-2 text-sm text-slate-700">{message}</p>}
  </section>
}
