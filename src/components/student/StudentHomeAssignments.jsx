import { useState } from 'react'
import StudentHomeAssignmentLaunchCard from './StudentHomeAssignmentLaunchCard'

// Assigned work: start the oldest undone item directly, or open the list to choose.
export default function StudentHomeAssignments({ todo, done, onStart, onFreePractice, freeDisabled }) {
  const [open, setOpen] = useState(false)
  if (todo.length === 0 && done.length === 0) {
    return <StudentHomeAssignmentLaunchCard assignment={null} onStart={onFreePractice} disabled={freeDisabled} />
  }
  const next = todo[0]
  return (
    <section aria-labelledby="my-assignments-title" className="bg-white border-2 border-blue-200 rounded-xl p-5 mb-6 shadow-sm">
      <h2 id="my-assignments-title" className="text-lg font-semibold text-gray-800">Mina uppdrag</h2>
      <p className="text-sm text-gray-600 mt-1">
        {next ? `${todo.length} att göra${done.length ? ` · ${done.length} klara` : ''}` : 'Alla uppdrag är klara ✓'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {next
          ? <button type="button" data-assignment-start-next onClick={() => onStart(next)}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg">Starta nästa: {next.title}</button>
          : <button type="button" onClick={onFreePractice} disabled={freeDisabled}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg">Fortsätt träna</button>}
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
