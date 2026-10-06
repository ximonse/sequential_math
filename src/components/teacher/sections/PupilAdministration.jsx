import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './adminApi'
import PupilAnalysisArchive from './PupilAnalysisArchive'
import { removeCachedProfile } from '../../../lib/serverDataCache'

function classIdsFor(profile) {
  return [...new Set([profile?.classId, ...(profile?.classIds || [])].map(String).filter(Boolean))]
}

export default function PupilAdministration({ classes, onRefresh, setStatus }) {
  const [pupils, setPupils] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const classById = useMemo(() => new Map(classes.map(record => [String(record.id), record])), [classes])

  const load = async () => {
    setLoading(true)
    const { ok, data } = await apiFetch('/api/students?includeArchived=1')
    if (ok) setPupils(data.profiles || [])
    else setStatus(data?.error || 'Kunde inte hämta elever.')
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const visiblePupils = useMemo(() => pupils.filter(profile => {
    if (showArchived) return true
    return classIdsFor(profile).some(id => !classById.get(id)?.archived)
  }), [pupils, showArchived, classById])

  const retirePupil = async (profile, mode) => {
    const label = profile.displayAlias || profile.studentId
    const anonymize = mode === 'anonymize'
    if (!window.confirm(anonymize
      ? `Anonymisera ${label}? Namn, kodnamn och konto tas bort. Statistik bevaras som en fryst serie för analys. Eleven kan inte fortsätta använda kontot.`
      : `Radera ${label} permanent? All elevdata, statistik och NCM-uträkningar tas bort och kan inte återställas.`)) return
    setBusy(true)
    try {
      const { ok, data } = await apiFetch('/api/student/' + encodeURIComponent(profile.studentId), anonymize
        ? { method: 'PATCH', body: JSON.stringify({ action: 'anonymize' }) } : { method: 'DELETE' })
      setStatus(ok ? anonymize ? '✓ Elev anonymiserad. Statistik finns kvar för analys.' : '✓ Elev raderad permanent'
        : data?.error || 'Elevåtgärden kunde inte slutföras. Kontrollera väntande städning nedan.')
      removeCachedProfile(profile.studentId)
      await Promise.all([load(), onRefresh()])
      setRefreshVersion(value => value + 1)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">Radera tar bort elevens data och statistik. Anonymisera tar bort namn och konto men sparar statistik för analys. Vid årskursbyte byter du namn på klassen och behåller eleverna.</p>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />
        Visa elever i arkiverade klasser
      </label>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        {loading ? <p className="p-3 text-xs text-gray-500">Hämtar elever…</p> : visiblePupils.length === 0 ? <p className="p-3 text-xs text-gray-500">Inga elever att visa.</p> : (
          <ul className="divide-y divide-gray-100">
            {visiblePupils.map(profile => {
              const memberships = classIdsFor(profile)
              const names = memberships.map(id => classById.get(id)?.name || id)
              const archivedOnly = memberships.length > 0 && memberships.every(id => classById.get(id)?.archived)
              return <li key={profile.studentId} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800">{profile.displayAlias || profile.studentId}</p>
                  <p className="truncate text-gray-500">{names.join(', ') || 'Ingen aktiv klass'}{archivedOnly ? ' · arkiverad' : ''}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => { void retirePupil(profile, 'anonymize') }} className="rounded bg-indigo-50 px-2 py-1 text-indigo-700 disabled:opacity-50">Anonymisera elev</button>
                  <button type="button" disabled={busy} onClick={() => { void retirePupil(profile, 'delete') }} className="rounded bg-red-50 px-2 py-1 text-red-700 disabled:opacity-50">Radera permanent</button>
                </div>
              </li>
            })}
          </ul>
        )}
      </div>
      <PupilAnalysisArchive refreshVersion={refreshVersion} />
    </div>
  )
}
