import { useEffect, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'
import { groupCollections } from './screeningCollections'
import useMaterialDraftLibrary from './useMaterialDraftLibrary.js'

// Private editable drafts and issued source content remain different objects.
export default function ScreeningMaterialLibrary({ library, onOpenDraft, onOpenMaterial, onReuse }) {
  const [drafts, setDrafts] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
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
  const sources = groupCollections(library.assignments).filter(item => matches(item.titleSv))
  return <section aria-label="Materialbibliotek" className="screening-materials">
    <p className="screening-note">Sparat innehåll att arbeta vidare med. Att öppna ett utkast delar inte ut något.</p>
    <div className="screening-toolbar">
      <label>Sök material<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <button type="button" onClick={() => { setRevision(value => value + 1); library.reload() }}>Läs om material</button>
    </div>
    {(loading || material.loading) && <p role="status">Hämtar privata utkast…</p>}
    {error && <p role="alert">{error} Dina utkast har inte ändrats.</p>}
    {material.error && <p role="alert">{material.error} Materialutkasten har inte ändrats.</p>}
    <h3>Privata utkast</h3>
    <p className="screening-note">Sparat innehåll med versionshistorik. Sparandet aktiverar ingen utdelning.</p>
    {drafts.filter(item => matches(item.titleSv)).map(draft => <article key={draft.draftId} aria-label={draft.titleSv} className="screening-material-row">
      <div><h4>{draft.titleSv}</h4><p className="screening-note">Privat utkast · version {draft.revision}</p></div>
      <button type="button" onClick={() => onOpenDraft(draft.draftId)}>Öppna utkast</button>
    </article>)}
    {material.drafts.filter(item => matches(item.titleSv)).map(draft => <article key={`material:${draft.draftId}`} aria-label={draft.titleSv} className="screening-material-row">
      <div><h4>{draft.titleSv}</h4><p className="screening-note">{draft.kind === 'practice' ? 'Träningsuppdrag' : 'Screening'} · {draft.mode === 'specific' ? 'Utifrån analys' : 'Generellt innehåll'} · version {draft.version} · {draft.approval === 'approved' ? 'Godkänt material' : 'För granskning'}</p></div>
      <button type="button" onClick={() => onOpenMaterial(draft.reviewPath)}>Öppna granskning</button>
    </article>)}
    {!loading && !material.loading && !error && !material.error && ![...drafts, ...material.drafts].some(item => matches(item.titleSv)) && <p>Inga privata utkast matchar sökningen. Skapa nytt och spara i innehållssteget.</p>}
    <h3 className="screening-section-title">Tidigare utdelat innehåll</h3>
    <p className="screening-note">Återanvänd frågorna i en ny utdelning. Tidigare elevsvar stannar i originalet.</p>
    {sources.map(source => <article key={source.id} aria-label={source.titleSv} className="screening-material-row">
      <div><h4>{source.titleSv}</h4><p className="screening-note">{source.members[0].items.length} frågor · utdelat {new Date(source.createdAt).toLocaleDateString('sv-SE')}</p></div>
      <button type="button" onClick={() => onReuse(source.members[0])}>Återanvänd</button>
    </article>)}
    {!sources.length && <p>Inget tidigare innehåll matchar sökningen.</p>}
  </section>
}
