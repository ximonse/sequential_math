import { useState } from 'react'
import { ASSIGNABLE_TABLES, FOCUS_MODE_LABELS, createAssignment } from '../../../lib/assignments'

const CHIP = 'rounded-md border px-1.5 py-0.5 text-sm font-medium'

// Table and focus assignments: pick tables, or pick which focus exercise to assign.
export default function AssignmentExtraPresets({ onCreated, breakGames }) {
  const [tables, setTables] = useState([])
  const toggle = table => setTables(previous => previous.includes(table)
    ? previous.filter(item => item !== table) : [...previous, table].sort((a, b) => a - b))
  const create = input => {
    const assignment = createAssignment({ ...input, breakGames })
    if (assignment) onCreated(assignment)
  }
  return <div className="mb-3 space-y-2 text-sm">
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tabelluppdrag">
      <span className="mr-1 font-medium text-gray-700">Tabell:</span>
      {ASSIGNABLE_TABLES.map(table => <button key={table} type="button" aria-pressed={tables.includes(table)} onClick={() => toggle(table)}
        className={`${CHIP} ${tables.includes(table) ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100'}`}>{table}</button>)}
      <button type="button" disabled={tables.length === 0} onClick={() => { create({ kind: 'table', tables }); setTables([]) }}
        className={`${CHIP} border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200 disabled:opacity-40`}>Skapa tabelluppdrag</button>
    </div>
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Fokusövning som uppdrag">
      <span className="mr-1 font-medium text-gray-700">Fokusövning:</span>
      {Object.entries(FOCUS_MODE_LABELS).map(([mode, label]) => <button key={mode} type="button" onClick={() => create({ kind: 'focus', focusMode: mode })}
        className={`${CHIP} border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200`}>{label}</button>)}
    </div>
  </div>
}
