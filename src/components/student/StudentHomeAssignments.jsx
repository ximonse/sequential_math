import { useState } from 'react'

// "Fokus Kim | Addition nivå 2-4" -> "Fokus: Addition nivå 2-4"; the pupil's own name is left out.
function personalTitle(title) {
  const [head, rest] = String(title || '').split('|')
  return rest ? `${head.trim().split(' ')[0]}: ${rest.trim()}` : String(title || '')
}

// Assigned work as one list: every assignment left to do is a row with its own
// start button, work the teacher gave this pupil alone first and marked. Done
// work is folded away. Free practice has its own home card.
export default function StudentHomeAssignments({ todo: allTodo, done, onStart, personalIds = new Set() }) {
  const [open, setOpen] = useState(false)
  if (allTodo.length === 0 && done.length === 0) return null
  const personal = allTodo.filter(item => personalIds.has(item.id))
  const todo = [...personal, ...allTodo.filter(item => !personalIds.has(item.id))]
  return (
    <section aria-labelledby="my-assignments-title" className="bg-white border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="my-assignments-title" className="text-lg font-semibold text-gray-800">Mina uppdrag</h2>
        <p className="text-sm text-gray-600">
          {todo.length ? `${todo.length} att göra${done.length ? ` · ${done.length} klara` : ''}` : 'Alla uppdrag är klara ✓'}
        </p>
      </div>
      {todo.length > 0 && <ul className="mt-3 space-y-2">
        {todo.map((item, index) => {
          const own = personalIds.has(item.id)
          const title = own ? personalTitle(item.title) : item.title
          return <li key={item.id} data-assignment-launch {...(own ? { 'data-personal-assignment': '' } : {})}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-4 px-3 py-2 ${own ? 'border-amber-400 bg-amber-50' : 'border-blue-300 bg-blue-50'}`}>
            <div>
              {own && <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Från din lärare</p>}
              <p className="font-semibold text-gray-900">{title}</p>
            </div>
            <button type="button" {...(index === 0 ? { 'data-assignment-start-next': '' } : {})} onClick={() => onStart(item)}
              aria-label={index === 0 ? `Starta nästa: ${item.title}` : `Starta uppdraget: ${item.title}`}
              className="shrink-0 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg">Starta</button>
          </li>
        })}
      </ul>}
      {done.length > 0 && <>
        <button type="button" aria-expanded={open} aria-controls="my-assignments-done" onClick={() => setOpen(value => !value)}
          className="mt-3 px-3 py-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg">
          {open ? 'Dölj klara' : `Visa klara (${done.length})`}
        </button>
        {open && <ul id="my-assignments-done" className="mt-2 divide-y divide-gray-100">
          {done.map(item => <li key={item.id} data-assignment-launch className="flex items-center justify-between gap-3 py-2">
            <span className="text-gray-500"><span aria-hidden="true">✓ </span>{personalIds.has(item.id) ? personalTitle(item.title) : item.title}</span>
            <button type="button" onClick={() => onStart(item)} aria-label={`Gör igen: ${item.title}`}
              className="shrink-0 px-3 py-1 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50">Gör igen</button>
          </li>)}
        </ul>}
      </>}
    </section>
  )
}
