import { useState } from 'react'

const statusOf = collection => {
  const active = collection.members.filter(member => member.status === 'active').length
  return active === collection.members.length ? 'Aktiv' : active ? 'Delvis avslutad' : 'Avslutad'
}

// The screenings handed out to the picked recipients, visible at once instead of
// behind a dropdown (Simon 2026-11-07). Choosing one opens it below the list.
export default function ScreeningResultsCollections({ collections, selectedId, onSelect, recipientsOf, selectedAction }) {
  const [limit, setLimit] = useState(8)
  return <section aria-label="Screeningar för valda mottagare" className="mt-3 text-sm">
    <h3 className="font-medium">Screeningar för valda mottagare ({collections.length})</h3>
    <ul className="mt-1 divide-y divide-slate-200 rounded border border-slate-300">
      {collections.slice(0, limit).map(collection => {
        const selected = collection.id === selectedId
        const recipients = recipientsOf(collection)
        const tasks = collection.members[0].items.length
        return <li key={collection.id} className={`flex items-center gap-2 ${selected ? 'bg-indigo-50 pr-2' : ''}`}>
          <button type="button" data-collection-id={collection.id} aria-pressed={selected} onClick={() => onSelect(collection.id)}
            title={`${recipients.full}
Utdelad ${new Date(collection.createdAt).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}. Klicka för att se svaren.`}
            className={`block min-w-0 flex-1 px-2 py-1 text-left ${selected ? '' : 'hover:bg-slate-50'}`}>
            <span className={`block ${selected ? 'font-semibold text-indigo-900' : 'font-medium text-slate-900'}`}>{collection.titleSv}</span>
            <span className="block text-xs text-slate-600">
              {statusOf(collection)} · {new Date(collection.createdAt).toLocaleDateString('sv-SE')} · {tasks} {tasks === 1 ? 'uppgift' : 'uppgifter'}
              {' · '}{recipients.short}
            </span>
          </button>
          {selected && selectedAction}
        </li>
      })}
    </ul>
    {collections.length > limit && <button type="button" onClick={() => setLimit(value => value + 8)}
      className="mt-1 rounded border border-slate-300 px-1.5 py-0.5 text-xs">Visa fler ({collections.length - limit} till)</button>}
  </section>
}
