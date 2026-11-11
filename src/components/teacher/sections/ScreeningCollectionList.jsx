import { useMemo, useState } from 'react'
import { groupCollections } from './screeningCollections'
import { resolveRecipientSelection } from './recipientSelection'
import ScreeningRecipientPicker from './ScreeningRecipientPicker'
import ScreeningCompletion from './ScreeningCompletion'
import ScreeningBulkBar from './ScreeningBulkBar'
import { scopeScreeningCollections } from './screeningCollectionScope'
import { describeRecipients } from './screeningRecipientNames'
import { bulkReceipt, isArchivedCollection, runBulk, runCollectionAction } from './screeningBulkActions'

const field = 'block rounded border border-slate-400 px-1 py-0.5'
const statusMatches = (collection, status) => {
  if (status === 'archived') return isArchivedCollection(collection)
  if (isArchivedCollection(collection)) return false
  if (status === 'active') return collection.members.some(member => member.status === 'active')
  if (status === 'stopped') return collection.members.every(member => member.status !== 'active')
  return true
}
// Confirmation texts name the consequence before anything happens (Simon 2026-11-07).
const ACTIONS = {
  stop: { label: 'Avsluta …', done: 'avslutade', title: 'Eleverna kan inte fortsätta. Påbörjade svar lämnas in som de är.',
    confirm: count => `Avsluta ${count} screeningar? Eleverna kan inte fortsätta. Påbörjade svar lämnas in som de är. Redan avslutade påverkas inte.` },
  archive: { label: 'Arkivera …', done: 'arkiverade', title: 'Döljs från listorna. Elevsvaren finns kvar under Status: Arkiverade.',
    confirm: count => `Arkivera ${count} screeningar? Aktiva avslutas först och påbörjade svar lämnas in. Elevsvaren finns kvar och syns under Status: Arkiverade.` },
  unarchive: { label: 'Återställ', done: 'återställda', title: 'Visas i listorna igen.', confirm: null },
  delete: { label: 'Radera …', done: 'raderade', danger: true, title: 'Tar bort screeningen och alla elevsvar för gott.',
    confirm: count => `Radera ${count} screeningar för gott? Alla elevsvar, uträkningar och genomgångar till dem tas bort och kan inte återställas. Aktiva avslutas först.` }
}

export default function ScreeningCollectionList({ context, library, onReuse, onResults }) {
  const [limit, setLimit] = useState(8)
  const [filters, setFilters] = useState({ picks: [], query: '', status: 'all', sort: 'newest' })
  const [showPicker, setShowPicker] = useState(false)
  const [ticked, setTicked] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState('')
  const collections = useMemo(() => groupCollections(library.assignments), [library.assignments])
  const selected = resolveRecipientSelection(filters.picks, context)
  const pupilIds = new Set(selected.pupils.map(item => item.studentId))
  const query = filters.query.toLocaleLowerCase('sv')
  const visible = scopeScreeningCollections(collections, filters.picks.length ? pupilIds : null)
    .filter(item => (!query || item.titleSv.toLocaleLowerCase('sv').includes(query)) && statusMatches(item, filters.status))
    .sort((a, b) => filters.sort === 'name' ? a.titleSv.localeCompare(b.titleSv, 'sv') : filters.sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt)
  const patch = value => { setFilters(previous => ({ ...previous, ...value })); setLimit(8) }
  const classNames = new Map(context.classes.map(item => [String(item.id), item.name]))
  const pupils = new Map(context.students.map(item => [item.studentId, item.name || item.displayAlias || 'Elev utan namn']))
  const shown = visible.slice(0, limit)
  // Only ticked rows that are still shown are acted on, so a filter change cannot hide what happens.
  const chosen = visible.filter(item => ticked.has(item.id))
  const toggle = id => setTicked(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const allShown = shown.length > 0 && shown.every(item => ticked.has(item.id))

  async function act(kind) {
    const action = ACTIONS[kind]
    if (busy || !chosen.length || (action.confirm && !window.confirm(action.confirm(chosen.length)))) return
    setBusy(true)
    // The full collection is acted on, not only the pupils the current filter shows.
    const full = new Map(collections.map(item => [item.id, item]))
    const results = await runBulk(chosen.map(item => ({ id: item.id, title: item.titleSv })), item => runCollectionAction(full.get(item.id), kind))
    setTicked(new Set(results.filter(item => !item.ok).map(item => item.id)))
    setReceipt(bulkReceipt(results, action.done))
    setBusy(false)
    library.reload()
  }

  const bulkActions = (filters.status === 'archived' ? ['unarchive', 'delete'] : ['stop', 'archive', 'delete'])
    .map(kind => ({ ...ACTIONS[kind], onClick: () => { void act(kind) } }))
  return <div className="screening-overview text-sm">
    <div className="my-2 flex flex-wrap items-end gap-2">
      <label title="Visningsurvalet väljer inga mottagare för utdelning.">Visa för<select aria-label="Visa screeningar för" className={field}
        value={filters.picks.length === 1 && filters.picks[0].type !== 'student' ? `${filters.picks[0].type}:${filters.picks[0].id}` : filters.picks.length ? 'custom' : 'all'}
        onChange={event => { const [type, ...id] = event.target.value.split(':'); patch({ picks: type === 'all' ? [] : [{ type, id: id.join(':') }] }) }}>
        <option value="all">Alla mina klasser</option>
        {filters.picks.length > 0 && <option value="custom" disabled>{selected.selected.map(item => item.name).join(', ')}</option>}
        <optgroup label="Klasser">{context.classes.map(item => <option key={item.id} value={`class:${item.id}`}>{item.name}</option>)}</optgroup>
        <optgroup label="Grupper">{context.groups.map(item => <option key={item.id} value={`group:${item.id}`}>{item.name}</option>)}</optgroup>
      </select></label>
      <button type="button" aria-expanded={showPicker} onClick={() => setShowPicker(value => !value)} title="Kombinera klasser och grupper eller sök enskilda elever."
        className="rounded border border-slate-400 px-2 py-0.5">Elever och kombinationer</button>
      <label className="min-w-48 flex-1">Sök screening<input type="search" value={filters.query} onChange={event => patch({ query: event.target.value })} className="block w-full rounded border border-slate-400 px-1.5 py-0.5" /></label>
      <label>Status<select value={filters.status} onChange={event => { setTicked(new Set()); patch({ status: event.target.value }) }} className={field}>
        <option value="all">Aktiva och avslutade</option><option value="active">Aktiva</option><option value="stopped">Avslutade</option><option value="archived">Arkiverade</option>
      </select></label>
      <label>Sortera<select value={filters.sort} onChange={event => patch({ sort: event.target.value })} className={field}>
        <option value="newest">Nyast först</option><option value="oldest">Äldst först</option><option value="name">Namn</option>
      </select></label>
      <button type="button" onClick={library.reload} title="Hämta listan från servern igen, till exempel efter en ny utdelning." className="rounded border border-slate-400 px-2 py-0.5">Läs om</button>
    </div>
    {showPicker && <div className="screening-context-editor"><ScreeningRecipientPicker {...context} recipients={filters.picks} onChange={picks => patch({ picks })} title="Visningsurval" purpose="filter" /></div>}
    {library.loading && <p role="status">Hämtar screeningar…</p>}
    {Object.entries(library.loaded).filter(([, item]) => item.error).map(([id, item]) => <p key={id} role="status" className="text-amber-900">{classNames.get(id)}: {item.error}</p>)}
    <ScreeningBulkBar count={chosen.length} actions={bulkActions} busy={busy} onClear={() => setTicked(new Set())} />
    {receipt && <p role="status" className="my-1 rounded border border-slate-300 bg-slate-50 px-2 py-1">{receipt}</p>}
    {!library.loading && !visible.length && <p>{filters.status === 'archived' ? 'Inga arkiverade screeningar matchar urvalet.' : 'Inga screeningar matchar urvalet. Skapa en ny under fliken Skapa ny.'}</p>}
    {shown.length > 0 && <label className="flex items-center gap-2 border-b border-slate-200 py-0.5 text-xs text-slate-600">
      <input type="checkbox" checked={allShown} onChange={() => setTicked(allShown ? new Set() : new Set(shown.map(item => item.id)))} />Markera alla som visas</label>}
    <div className="divide-y divide-slate-200">{shown.map(collection => {
      const activeCount = collection.members.filter(member => member.status === 'active').length
      const recipients = describeRecipients(collection, { students: context.students, classNames })
      const questions = collection.members[0].items.length
      const status = isArchivedCollection(collection) ? 'Arkiverad' : activeCount === collection.members.length ? 'Aktiv' : activeCount ? 'Delvis avslutad' : 'Avslutad'
      return <article key={collection.id} className={`flex items-start gap-2 py-1 ${ticked.has(collection.id) ? 'bg-indigo-50' : ''}`} aria-label={collection.titleSv}>
        <input type="checkbox" className="mt-1" checked={ticked.has(collection.id)} onChange={() => toggle(collection.id)} aria-label={`Markera ${collection.titleSv}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div><h4 className="font-semibold">{collection.titleSv}</h4>
              <p className="text-xs text-slate-600" title={`${recipients.full}\nUtdelad ${new Date(collection.createdAt).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}`}>
                {status} · {recipients.short} · {questions} {questions === 1 ? 'fråga' : 'frågor'} · {new Date(collection.createdAt).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onReuse(collection.members[0])} title="Skapa en ny screening med samma frågor. Den utdelade ändras inte." className="rounded border border-slate-400 px-2 py-0.5">Återanvänd</button>
              <button type="button" onClick={() => onResults(collection, filters.picks)} title="Öppna svaren under Resultat. Där kan du också avsluta screeningen." className="rounded border border-slate-400 px-2 py-0.5">Resultat och avslut</button>
            </div>
          </div>
          <ScreeningCompletion members={collection.members} revision={library.revision} names={pupils} />
        </div>
      </article>
    })}</div>
    {visible.length > limit && <button type="button" onClick={() => setLimit(value => value + 8)}>Visa fler screeningar ({visible.length - limit} kvar)</button>}
  </div>
}
