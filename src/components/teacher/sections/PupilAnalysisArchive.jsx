import { useEffect, useState } from 'react'
import { apiFetch } from './adminApi'

export default function PupilAnalysisArchive({ refreshVersion }) {
  const [archives, setArchives] = useState([])
  const [pending, setPending] = useState([])
  const [detail, setDetail] = useState(null)
  const [status, setStatus] = useState('')
  async function load() {
    const result = await apiFetch('/api/admin/pupil-analysis')
    if (!result.ok) { setStatus(result.data.error || 'Kunde inte hämta statistik.'); return }
    setArchives(result.data.archives || [])
    setPending(result.data.pending || [])
  }
  useEffect(() => { void load() }, [refreshVersion])
  async function open(archiveId) {
    const result = await apiFetch(`/api/admin/pupil-analysis?archiveId=${archiveId}`)
    if (result.ok) { setDetail(result.data.archive); setStatus('') }
    else setStatus(result.data.error || 'Kunde inte öppna statistik.')
  }
  async function remove(archiveId) {
    if (!window.confirm('Radera denna statistikpost permanent? Den kan inte återställas.')) return
    const result = await apiFetch(`/api/admin/pupil-analysis?archiveId=${archiveId}`, { method: 'DELETE' })
    if (!result.ok) { setStatus(result.data.error || 'Kunde inte radera statistik.'); return }
    if (detail?.archiveId === archiveId) setDetail(null)
    await load()
  }
  async function resume(studentId) {
    const result = await apiFetch('/api/admin/pupil-analysis', { method: 'POST', body: JSON.stringify({ studentId }) })
    setStatus(result.ok ? 'Städningen är klar.' : result.data.error || 'Städningen väntar fortfarande. Försök igen.')
    await load()
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(detail, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = `elevstatistik-${detail.archiveId}.json`; link.click()
    URL.revokeObjectURL(url)
  }
  return <section aria-label="Statistik utan elevnamn" className="space-y-2 rounded border border-gray-200 p-3">
    <h3 className="font-semibold">Statistik utan elevnamn</h3>
    <p className="text-xs text-gray-600">Frysta serier från elever du har anonymiserat. Namn, kodnamn och gamla kontokopplingar ingår inte. Varje serie håller ihop en elevs tidigare resultat.</p>
    {status && <p role="status" className="text-sm">{status}</p>}
    {pending.map(job => <div key={job.studentId} className="text-sm">
      {job.mode === 'delete' ? 'Radering' : 'Anonymisering'} väntar på städning.
      <button onClick={() => resume(job.studentId)} className="ml-2 rounded bg-amber-100 px-2 py-1">Återuppta städning</button>
    </div>)}
    {archives.length === 0 && <p className="text-xs">Inga sparade statistikposter.</p>}
    {archives.map((archive, index) => <div key={archive.archiveId} className="flex flex-wrap items-center gap-2 text-xs">
      <span>Serie {index + 1} · åk {archive.grade} · {archive.trainingAnswers} träningssvar · {archive.diagnosticPoints} diagnostikpunkter</span>
      <button onClick={() => open(archive.archiveId)} className="rounded bg-indigo-100 px-2 py-1">Visa statistik</button>
      <button onClick={() => remove(archive.archiveId)} className="rounded bg-red-50 px-2 py-1 text-red-700">Radera statistik</button>
    </div>)}
    {detail && <div className="space-y-1 rounded bg-gray-50 p-2 text-sm">
      <p>Sparade träningssvar: {detail.training.attempts.length}</p>
      <p>Rätt av sparade svar: {detail.training.attempts.filter(attempt => attempt.correct).length}</p>
      <p>Diagnostikpunkter: {detail.diagnostics.points.length}</p>
      <p className="text-xs">{detail.training.historyComplete ? 'Den sparade träningshistoriken är fullständig.' : 'Träningshistoriken kan vara begränsad. Livstidssummor finns i exporten när de har lagrats.'}</p>
      <button onClick={download} className="rounded bg-indigo-600 px-2 py-1 text-white">Exportera statistik (JSON)</button>
    </div>}
  </section>
}
