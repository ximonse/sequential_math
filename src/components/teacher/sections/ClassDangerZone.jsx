import { apiFetch } from './adminApi'
import { getTeacherApiToken } from '../../../lib/teacherAuth'

const BOX = 'rounded border border-rose-200 bg-rose-50 p-3'

// Actions that end or wipe a class, kept apart from routine work.
export default function ClassDangerZone({ classRecord, canArchive, canDelete, canResetAccounts, onChanged, onCredentials, setStatus, runAction }) {
  const updateLifecycle = async action => {
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
      onChanged(action)
    } else setStatus(data?.error || 'Kunde inte ändra klassen')
  }

  const resetAccounts = async () => {
    const confirmed = window.confirm(`Återställ alla elevkonton i ${classRecord.name}?\n\nAll elevdata rensas: träningshistorik, äldre lösenord, gamla QR-kort, PIN-koder och kodnamn. Förnamn och klasstillhörighet behålls. Nya elevkort måste hämtas direkt efteråt.`)
    if (!confirmed) return
    setStatus('Återställer elevkonton...')
    const response = await fetch('/api/student-class-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-teacher-token': getTeacherApiToken() },
      body: JSON.stringify({ classId: classRecord.id })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setStatus(data.error || 'Kunde inte återställa elevkontona.')
      return
    }
    onCredentials(data.credentials || [])
    setStatus(`${data.credentials?.length || 0} elevkonton är återställda. Hämta PDF:en innan du lämnar sidan.`)
  }

  return (
    <div data-class-danger-zone className="space-y-3 text-xs">
      {canResetAccounts && !classRecord.archived && <div className={BOX}>
        <p className="font-semibold text-rose-900">Återställ alla elevkonton</p>
        <p className="mt-1 text-rose-900">Rensar elevdata i klassen och utfärdar nya QR-kort och PIN-koder.</p>
        <button type="button" onClick={() => runAction(resetAccounts)} className="mt-2 rounded bg-rose-700 px-3 py-1.5 font-semibold text-white">Återställ och skapa nya elevkort</button>
      </div>}
      {canArchive && (classRecord.archived ? <div className={BOX}>
        <p className="font-semibold text-rose-900">Klassen är arkiverad</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => runAction(() => updateLifecycle('restore'))} className="rounded bg-white px-3 py-1.5 font-semibold text-green-800 ring-1 ring-green-300">Återställ</button>
          {canDelete && <button type="button" onClick={() => runAction(() => updateLifecycle('delete'))} className="rounded bg-rose-700 px-3 py-1.5 font-semibold text-white">Radera permanent</button>}
        </div>
      </div> : <div className={BOX}>
        <p className="font-semibold text-rose-900">Arkivera klassen</p>
        <p className="mt-1 text-rose-900">Klassen döljs i lärarvyn. Eleverna och deras resultat finns kvar.</p>
        <button type="button" onClick={() => runAction(() => updateLifecycle('archive'))} className="mt-2 rounded bg-rose-700 px-3 py-1.5 font-semibold text-white">Arkivera</button>
      </div>)}
      {!canArchive && !canResetAccounts && <p className="text-gray-600">Inga åtgärder här för ditt konto.</p>}
    </div>
  )
}
