import { useState } from 'react'

// Assigned work: start the oldest undone item directly, or open the list to choose.
// Free practice has its own home card, so this section only shows assignments.
// "Fokus Kim | Addition nivå 2-4" -> "Fokus: Addition nivå 2-4"; the pupil's own name is left out.
function personalTitle(title) {
  const [head, rest] = String(title || '').split('|')
  return rest ? `${head.trim().split(' ')[0]}: ${rest.trim()}` : String(title || '')
}

export default function StudentHomeAssignments({ todo: allTodo, done, onStart, personalIds = new Set() }) {
  const [open, setOpen] = useState(false)
  if (allTodo.length === 0 && done.length === 0) return null
  // Work the teacher put on this pupil alone comes first and stands out.
  const personal = allTodo.filter(item => personalIds.has(item.id))
  const shared = allTodo.filter(item => !personalIds.has(item.id))
  const todo = [...personal, ...shared]
  // The personal block has its own start button; "next" covers the rest.
  const next = shared[0]
  return (
    <section aria-labelledby="my-assignments-title" className="bg-white border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
      {personal.map(item => <div key={item.id} data-personal-assignment
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Från din lärare</p>
          <p className="text-lg font-semibold text-gray-900">{personalTitle(item.title)}</p>
        </div>
        <button type="button" onClick={() => onStart(item)} aria-label={`Starta uppdraget från din lärare: ${personalTitle(item.title)}`}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg">Starta</button>
      </div>)}
      <h2 id="my-assignments-title" className="text-lg font-semibold text-gray-800">Mina uppdrag</h2>
      <p className="text-sm text-gray-600 mt-1">
        {todo.length ? `${todo.length} att göra${done.length ? ` · ${done.length} klara` : ''}` : 'Alla uppdrag är klara ✓'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {next && <button type="button" data-assignment-start-next onClick={() => onStart(next)}
          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg">Starta nästa: {next.title}</button>}
        <button type="button" aria-expanded={open} aria-controls="my-assignments-list" onClick={() => setOpen(value => !value)}
          className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-lg">
          {open ? 'Dölj mina uppdrag' : `Visa mina uppdrag (${todo.length + done.length})`}
        </button>
      </div>
      {open && <div id="my-assignments-list" className="mt-4 space-y-4">
        {todo.length > 0 && <AssignmentList title="Att göra" items={todo} action="Starta uppdraget" onStart={onStart} />}
        {done.length > 0 && <AssignmentList title="Klara ✓" items={done} action="Gör igen" onStart={onStart} done />}
      </div>}
    </section>
  )
}

function AssignmentList({ title, items, action, onStart, done = false }) {
  return <div>
    <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    <ul className="mt-1 divide-y divide-gray-100">
      {items.map(item => <li key={item.id} data-assignment-launch className="flex items-center justify-between gap-3 py-2">
        <span className={done ? 'text-gray-500' : 'text-gray-800'}>{done && <span aria-hidden="true">✓ </span>}{item.title}</span>
        <button type="button" onClick={() => onStart(item)} aria-label={`${action}: ${item.title}`}
          className={`shrink-0 px-3 py-1 rounded-lg text-sm font-semibold ${done ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-green-600 text-white hover:bg-green-700'}`}>
          {action}
        </button>
      </li>)}
    </ul>
  </div>
}
