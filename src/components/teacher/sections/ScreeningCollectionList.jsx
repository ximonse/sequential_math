import { useMemo, useState } from 'react'
import { groupCollections } from './screeningCollections'
import { resolveRecipientSelection } from './recipientSelection'
import ScreeningRecipientPicker from './ScreeningRecipientPicker'

export default function ScreeningCollectionList({ context, library, onStart, onReuse, onResults, hasDraft, onResume }) {
  const [filters, setFilters] = useState({ picks: [], query: '', status: 'all', sort: 'newest' })
  const collections = useMemo(() => groupCollections(library.assignments), [library.assignments])
  const selected = resolveRecipientSelection(filters.picks, context)
  const pupilIds = new Set(selected.pupils.map(item => item.studentId))
  const visible = collections.filter(item => (!filters.query || item.titleSv.toLocaleLowerCase('sv').includes(filters.query.toLocaleLowerCase('sv')))
    && (filters.status === 'all' || (filters.status === 'active' ? item.members.some(member => member.status === 'active') : item.members.every(member => member.status !== 'active')))
    && (!filters.picks.length || item.members.some(member => member.studentIds.some(id => pupilIds.has(id)))))
    .sort((a, b) => filters.sort === 'name' ? a.titleSv.localeCompare(b.titleSv, 'sv') : filters.sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt)
  const patch = value => setFilters(previous => ({ ...previous, ...value }))
  const classNames = new Map(context.classes.map(item => [String(item.id), item.name]))
  const pupils = new Map(context.students.map(item => [item.studentId, item.name || item.displayAlias || 'Elev utan namn']))
  return <div className="text-sm">
    <div className="my-2 flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Utdelade screeningar</h3>
      <div className="flex flex-wrap gap-2">
        {hasDraft && <button type="button" onClick={onResume} className="rounded border border-slate-400 px-2 py-0.5">Återgå till utdelning</button>}
        <button type="button" onClick={onStart} className="rounded bg-indigo-600 px-2 py-0.5 font-semibold text-white">Dela ut screening</button>
      </div>
    </div>
    <details className="my-2"><summary className="cursor-pointer">Visa för: {filters.picks.length ? selected.selected.map(item => item.name).join(', ') : 'alla mina klasser'}</summary>
      <div className="mt-2"><ScreeningRecipientPicker {...context} recipients={filters.picks} onChange={picks => patch({ picks })} title="Visa screeningar för" /></div>
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
    <div className="divide-y divide-slate-200">{visible.map(collection => {
      const ids = [...new Set(collection.members.flatMap(member => member.studentIds))]
      const activeCount = collection.members.filter(member => member.status === 'active').length
      return <article key={collection.id} className="py-1" aria-label={collection.titleSv}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div><h4 className="font-semibold">{collection.titleSv}</h4>
            <p className="text-xs text-slate-600">{activeCount === collection.members.length ? 'Aktiv' : activeCount ? 'Delvis avslutad' : 'Avslutad'} · {ids.length} elever · {collection.members[0].items.length} frågor · {new Date(collection.createdAt).toLocaleDateString('sv-SE')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onReuse(collection.members[0])} className="rounded border border-slate-400 px-2 py-0.5">Återanvänd</button>
            <button type="button" onClick={() => onResults(collection)} className="rounded border border-slate-400 px-2 py-0.5">Resultat och avslut</button>
          </div>
        </div>
        <details className="mt-0.5"><summary className="cursor-pointer text-xs">Visa mottagare ({ids.length} elever)</summary>
          {collection.members.map(member => <div key={member.assignmentId} className="mt-1">
            <p className="font-medium">{classNames.get(member.classId) || 'Klass'} · {member.status === 'active' ? 'Aktiv' : 'Avslutad'}</p>
            <ul className="grid gap-x-4 sm:grid-cols-2">{member.studentIds.map(id => <li key={id}>{pupils.get(id) || 'Elev som inte längre finns i underlaget'}</li>)}</ul>
          </div>)}
        </details>
      </article>
    })}</div>
  </div>
}
