import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from './adminApi'

function classIdsFor(profile) {
  return [...new Set([profile?.classId, ...(profile?.classIds || [])].map(String).filter(Boolean))]
}

export default function PupilAdministration({ classes, onRefresh, setStatus }) {
  const [pupils, setPupils] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
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

  const deletePupil = async profile => {
    const label = profile.displayAlias || profile.studentId
    if (!window.confirm(`Radera ${label} permanent? All elevdata och träningshistorik tas bort och kan inte återställas.`)) return
    const { ok, data } = await apiFetch('/api/student/' + encodeURIComponent(profile.studentId), { method: 'DELETE' })
    if (!ok) { setStatus(data?.error || 'Kunde inte radera eleven.'); return }
    setStatus('✓ Elev raderad permanent')
    await Promise.all([load(), onRefresh()])
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">Permanent radering används bara när en elev inte längre ska finnas kvar. Vid årskursbyte byter du i stället namn på klassen — elever och träningshistorik behålls.</p>
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
                <button type="button" onClick={() => { void deletePupil(profile) }} className="shrink-0 rounded bg-red-50 px-2 py-1 text-red-700 hover:bg-red-100">Radera permanent</button>
              </li>
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
