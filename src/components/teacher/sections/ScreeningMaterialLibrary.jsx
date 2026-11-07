import { useEffect, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'
import useMaterialDraftLibrary from './useMaterialDraftLibrary.js'
import ScreeningBulkBar from './ScreeningBulkBar'
import { bulkReceipt, runBulk } from './screeningBulkActions'

const date = value => value ? new Date(value).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }) : ''
const dateTime = value => value ? new Date(value).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : ''

// Private editable drafts and issued source content remain different objects. Both
// kinds share one list (Simon 2026-11-07); only screening drafts can be deleted here.
export default function ScreeningMaterialLibrary({ library, onOpenDraft, onOpenMaterial }) {
  const [drafts, setDrafts] = useState([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('updated')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [ticked, setTicked] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState('')
  const material = useMaterialDraftLibrary(`${revision}:${library.revision}`)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    diagnosticRequest('/api/teacher-diagnostic-assignments?resource=drafts').then(result => {
      if (!result.ok) throw Error(result.data.error || 'Kunde inte läsa materialet.')
      if (active) setDrafts(result.data.drafts)
    }).catch(failure => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision, library.revision])
  const matches = value => value.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv'))
  const rows = [
    ...drafts.map(draft => ({ id: draft.draftId, kind: 'draft', title: draft.titleSv, updatedAt: draft.updatedAt,
      meta: `Screening · version ${draft.revision}`, hint: `Ändrad ${dateTime(draft.updatedAt)}` })),
    ...material.drafts.map(draft => ({ id: `material:${draft.draftId}`, kind: 'material', title: draft.titleSv, updatedAt: draft.updatedAt, path: draft.reviewPath,
      meta: `${draft.kind === 'practice' ? 'Träningsuppdrag' : 'Screening'} · ${draft.mode === 'specific' ? 'Utifrån analys' : 'Generellt innehåll'} · version ${draft.version} · ${draft.approval === 'approved' ? 'Godkänt material' : 'För granskning'}`,
      hint: `Ändrad ${dateTime(draft.updatedAt)}. Material raderas inte här.` }))
  ].filter(row => matches(row.title))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'sv') : (b.updatedAt || 0) - (a.updatedAt || 0))
  const deletable = rows.filter(row => row.kind === 'draft')
  const chosen = deletable.filter(row => ticked.has(row.id))
  const allTicked = deletable.length > 0 && deletable.every(row => ticked.has(row.id))
  const toggle = id => setTicked(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next })

  async function remove() {
    if (busy || !chosen.length || !window.confirm(`Radera ${chosen.length} utkast? Utkasten är privata och har inga elevsvar, men alla sparade versioner försvinner och kan inte återställas.`)) return
    setBusy(true)
    const results = await runBulk(chosen, async row => {
      const result = await diagnosticRequest('/api/teacher-diagnostic-assignments?resource=drafts', { method: 'POST', body: JSON.stringify({ action: 'delete_draft', draftId: row.id }) })
      if (!result.ok) throw new Error(result.data.error || 'Servern svarade inte som väntat.')
    })
    setTicked(new Set(results.filter(item => !item.ok).map(item => item.id)))
    setReceipt(bulkReceipt(results, 'utkast raderade'))
    setBusy(false)
    setRevision(value => value + 1)
  }

  return <section aria-label="Utkast" className="screening-materials">
    <div className="screening-toolbar">
      <label>Sök utkast<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>Sortera<select value={sort} onChange={event => setSort(event.target.value)}><option value="updated">Senast ändrad</option><option value="name">Namn</option></select></label>
      <button type="button" title="Hämta utkasten från servern igen." onClick={() => { setRevision(value => value + 1); library.reload() }}>Läs om utkast</button>
    </div>
    <p className="screening-note">Utkast är privata. Att öppna ett utkast delar inte ut något.</p>
    {(loading || material.loading) && <p role="status">Hämtar privata utkast…</p>}
    {error && <p role="alert">{error} Dina utkast har inte ändrats.</p>}
    {material.error && <p role="alert">{material.error} Materialutkasten har inte ändrats.</p>}
    <ScreeningBulkBar count={chosen.length} busy={busy} onClear={() => setTicked(new Set())}
      actions={[{ label: 'Radera …', danger: true, title: 'Tar bort de markerade utkasten och alla deras versioner.', onClick: () => { void remove() } }]} />
    {receipt && <p role="status" className="my-1 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-sm">{receipt}</p>}
    {deletable.length > 0 && <label className="flex items-center gap-2 border-b border-slate-200 py-0.5 text-xs text-slate-600">
      <input type="checkbox" checked={allTicked} onChange={() => setTicked(allTicked ? new Set() : new Set(deletable.map(row => row.id)))} />Markera alla utkast</label>}
    {rows.map(row => <article key={row.id} aria-label={row.title} title={row.hint} className={`screening-material-row ${ticked.has(row.id) ? 'bg-indigo-50' : ''}`}>
      <div className="flex items-start gap-2">
        <input type="checkbox" className="mt-1" disabled={row.kind !== 'draft'} checked={ticked.has(row.id)} onChange={() => toggle(row.id)}
          aria-label={`Markera ${row.title}`} title={row.kind === 'draft' ? undefined : 'Material raderas inte här.'} />
        <div><h4>{row.title}</h4><p className="screening-note">{row.meta}{row.updatedAt ? ` · ändrad ${date(row.updatedAt)}` : ''}</p></div>
      </div>
      {row.kind === 'draft'
        ? <button type="button" title="Öppnar utkastet under Skapa ny. Inget delas ut." onClick={() => onOpenDraft(row.id)}>Öppna utkast</button>
        : <button type="button" title="Öppnar materialet i granskningsvyn." onClick={() => onOpenMaterial(row.path)}>Öppna granskning</button>}
    </article>)}
    {!loading && !material.loading && !error && !material.error && !rows.length && <p>Inga utkast matchar sökningen. Skapa en ny screening och spara den som utkast.</p>}
  </section>
}
