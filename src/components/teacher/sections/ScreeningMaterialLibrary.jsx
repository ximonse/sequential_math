import { useEffect, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'
import { groupCollections } from './screeningCollections'

// Private editable drafts and issued source content remain different objects.
export default function ScreeningMaterialLibrary({ library, onOpenDraft, onReuse }) {
  const [drafts, setDrafts] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
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
    <p className="screening-note">Sparat innehåll att arbeta vidare med. Att öppna eller återanvända väljer inga mottagare.</p>
    <div className="screening-toolbar">
      <label>Sök material<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <button type="button" onClick={() => { setRevision(value => value + 1); library.reload() }}>Läs om material</button>
    </div>
    {loading && <p role="status">Hämtar privata utkast…</p>}
    {error && <p role="alert">{error} Dina utkast har inte ändrats.</p>}
    <h3>Privata utkast</h3>
    <p className="screening-note">Redigerbara frågor med versionshistorik. Inget är utdelat genom att utkastet sparas.</p>
    {drafts.filter(item => matches(item.titleSv)).map(draft => <article key={draft.draftId} aria-label={draft.titleSv} className="screening-material-row">
      <div><h4>{draft.titleSv}</h4><p className="screening-note">Privat utkast · version {draft.revision}</p></div>
      <button type="button" onClick={() => onOpenDraft(draft.draftId)}>Öppna utkast</button>
    </article>)}
    {!loading && !error && !drafts.some(item => matches(item.titleSv)) && <p>Inga privata utkast matchar sökningen. Skapa nytt och spara i innehållssteget.</p>}
    <h3 className="screening-section-title">Tidigare utdelat innehåll</h3>
    <p className="screening-note">Återanvänd frågorna i en ny utdelning. Tidigare elevsvar stannar i originalet.</p>
    {sources.map(source => <article key={source.id} aria-label={source.titleSv} className="screening-material-row">
      <div><h4>{source.titleSv}</h4><p className="screening-note">{source.members[0].items.length} frågor · utdelat {new Date(source.createdAt).toLocaleDateString('sv-SE')}</p></div>
      <button type="button" onClick={() => onReuse(source.members[0])}>Återanvänd</button>
    </article>)}
    {!sources.length && <p>Inget tidigare innehåll matchar sökningen.</p>}
  </section>
}
