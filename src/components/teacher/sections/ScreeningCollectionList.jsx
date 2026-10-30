import { useId, useMemo, useState } from 'react'
import { groupCollections } from './screeningCollections'
import { resolveRecipientSelection } from './recipientSelection'
import ScreeningRecipientPicker from './ScreeningRecipientPicker'
import ScreeningMaterialLibrary from './ScreeningMaterialLibrary'
import ScreeningCompletion from './ScreeningCompletion'
import { scopeScreeningCollections } from './screeningCollectionScope'

export default function ScreeningCollectionList({ context, library, onStart, onReuse, onOpenDraft, onOpenMaterial, onResults, hasDraft, onResume }) {
  const [tab, setTab] = useState('issued')
  const [limit, setLimit] = useState(8)
  const tabId = useId()
  const [filters, setFilters] = useState({ picks: [], query: '', status: 'all', sort: 'newest' })
  const collections = useMemo(() => groupCollections(library.assignments), [library.assignments])
  const selected = resolveRecipientSelection(filters.picks, context)
  const pupilIds = new Set(selected.pupils.map(item => item.studentId))
  const visible = scopeScreeningCollections(collections, filters.picks.length ? pupilIds : null).filter(item => (!filters.query || item.titleSv.toLocaleLowerCase('sv').includes(filters.query.toLocaleLowerCase('sv')))
    && (filters.status === 'all' || (filters.status === 'active' ? item.members.some(member => member.status === 'active') : item.members.every(member => member.status !== 'active'))))
    .sort((a, b) => filters.sort === 'name' ? a.titleSv.localeCompare(b.titleSv, 'sv') : filters.sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt)
  const patch = value => { setFilters(previous => ({ ...previous, ...value })); setLimit(8) }
  const classNames = new Map(context.classes.map(item => [String(item.id), item.name]))
  const pupils = new Map(context.students.map(item => [item.studentId, item.name || item.displayAlias || 'Elev utan namn']))
  return <div className="screening-overview text-sm">
    <div className="my-2 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">{tab === 'issued' ? 'Utdelade screeningar' : 'Sparat innehåll'}</h3>
      <div className="flex flex-wrap gap-2">
        {hasDraft && <button type="button" onClick={onResume} className="rounded border border-slate-400 px-2 py-0.5">Återgå till utdelning</button>}
        <button type="button" onClick={onStart} className="rounded bg-indigo-600 px-2 py-0.5 font-semibold text-white">Dela ut screening</button>
      </div>
    </div>
    <div className="screening-tabs" role="tablist" aria-label="Screeninglistor" onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const next = event.key === 'Home' ? 'issued' : event.key === 'End' ? 'library' : tab === 'issued' ? 'library' : 'issued'
      setTab(next)
      event.currentTarget.querySelector(`[data-screening-tab="${next}"]`).focus()
    }}>
      {[['issued', 'Utdelat'], ['library', 'Materialbibliotek']].map(([value, label]) => <button key={value} type="button" role="tab" id={`${tabId}-${value}`} data-screening-tab={value}
        aria-controls={`${tabId}-panel`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`${tabId}-panel`} aria-labelledby={`${tabId}-${tab}`}>
    {tab === 'library' ? <ScreeningMaterialLibrary library={library} onOpenDraft={onOpenDraft} onOpenMaterial={onOpenMaterial} onReuse={onReuse} /> : <>
    <div className="screening-view-context screening-bar">
      <label>Visa för <select aria-label="Visa screeningar för" value={filters.picks.length === 1 && filters.picks[0].type !== 'student' ? `${filters.picks[0].type}:${filters.picks[0].id}` : filters.picks.length ? 'custom' : 'all'}
        onChange={event => { const [type, ...id] = event.target.value.split(':'); patch({ picks: type === 'all' ? [] : [{ type, id: id.join(':') }] }) }}>
        <option value="all">Alla mina klasser</option>
        {filters.picks.length > 0 && <option value="custom" disabled>{selected.selected.map(item => item.name).join(', ')}</option>}
        <optgroup label="Klasser">{context.classes.map(item => <option key={item.id} value={`class:${item.id}`}>{item.name}</option>)}</optgroup>
        <optgroup label="Grupper">{context.groups.map(item => <option key={item.id} value={`group:${item.id}`}>{item.name}</option>)}</optgroup>
      </select></label>
      <span className="screening-note">Visningsurvalet väljer inga mottagare för utdelning.</span>
    </div>
    <details><summary>Fler visningsurval · kombinera eller sök elever</summary>
      <div className="screening-context-editor"><ScreeningRecipientPicker {...context} recipients={filters.picks} onChange={picks => patch({ picks })} title="Visningsurval" purpose="filter" /></div>
    </details>
    <div className="my-2 flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1">Sök screening<input type="search" value={filters.query} onChange={event => patch({ query: event.target.value })} className="block w-full rounded border border-slate-400 px-1.5 py-0.5" /></label>
      <label>Status<select value={filters.status} onChange={event => patch({ status: event.target.value })} className="block rounded border border-slate-400 px-1 py-0.5">
        <option value="all">Alla</option><option value="active">Aktiva</option><option value="stopped">Avslutade</option>
      </select></label>
      <label>Sortera<select value={filters.sort} onChange={event => patch({ sort: event.target.value })} className="block rounded border border-slate-400 px-1 py-0.5">
        <option value="newest">Nyast först</option><option value="oldest">Äldst först</option><option value="name">Namn</option>
      </select></label>
      <button type="button" onClick={library.reload} className="rounded border border-slate-400 px-2 py-0.5">Läs om</button>
    </div>
    {library.loading && <p role="status">Hämtar screeningar…</p>}
    {Object.entries(library.loaded).filter(([, item]) => item.error).map(([id, item]) => <p key={id} role="status" className="text-amber-900">{classNames.get(id)}: {item.error}</p>)}
    {!library.loading && !visible.length && <p>Inga screeningar matchar urvalet. Du kan återanvända tidigare innehåll eller skapa nytt med Dela ut screening.</p>}
    <div className="divide-y divide-slate-200">{visible.slice(0, limit).map(collection => {
      const ids = [...new Set(collection.members.flatMap(member => member.studentIds))]
      const activeCount = collection.members.filter(member => member.status === 'active').length
      return <article key={collection.id} className="py-1" aria-label={collection.titleSv}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div><h4 className="font-semibold">{collection.titleSv}</h4>
            <p className="text-xs text-slate-600">{activeCount === collection.members.length ? 'Aktiv' : activeCount ? 'Delvis avslutad' : 'Avslutad'} · {ids.length} {ids.length === 1 ? 'elev' : 'elever'} · {collection.members[0].items.length} frågor · {new Date(collection.createdAt).toLocaleDateString('sv-SE')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onReuse(collection.members[0])} className="rounded border border-slate-400 px-2 py-0.5">Återanvänd</button>
            <button type="button" onClick={() => onResults(collection, filters.picks)} className="rounded border border-slate-400 px-2 py-0.5">Resultat och avslut</button>
          </div>
        </div>
        <ScreeningCompletion members={collection.members} revision={library.revision} names={pupils} />
        <details className="mt-0.5"><summary className="cursor-pointer text-xs">Visa mottagare ({ids.length} {ids.length === 1 ? 'elev' : 'elever'})</summary>
          {collection.members.map(member => <div key={member.assignmentId} className="mt-1">
            <p className="font-medium">{classNames.get(member.classId) || 'Klass'} · {member.status === 'active' ? 'Aktiv' : 'Avslutad'}</p>
            <ul className="grid gap-x-4 sm:grid-cols-2">{member.studentIds.map(id => <li key={id}>{pupils.get(id) || 'Elev som inte längre finns i underlaget'}</li>)}</ul>
          </div>)}
        </details>
      </article>
    })}</div>
    {visible.length > limit && <button type="button" onClick={() => setLimit(value => value + 8)}>Visa fler screeningar ({visible.length - limit} kvar)</button>}
    </>}
    </div>
  </div>
}
