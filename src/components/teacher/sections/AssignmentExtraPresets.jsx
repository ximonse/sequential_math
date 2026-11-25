import { useState } from 'react'
import { ASSIGNABLE_TABLES, FOCUS_MODE_LABELS, createAssignment } from '../../../lib/assignments'
import { sharedAssignmentSettings } from '../../../lib/assignmentSettings'

const CHIP = 'rounded-md border px-1.5 py-0.5 text-sm font-medium'

// Each kind carries only the shared settings its pupil view honours.
function useCreator(onCreated, settings) {
  return input => {
    const assignment = createAssignment({ ...input, ...sharedAssignmentSettings(input.kind, settings) })
    if (assignment) onCreated(assignment)
  }
}

// Multiplication tables the teacher marks, as one assignment.
export function AssignmentTablePreset({ onCreated, breakGames, workspaces }) {
  const [tables, setTables] = useState([])
  const create = useCreator(onCreated, { breakGames, workspaces })
  const toggle = table => setTables(previous => previous.includes(table)
    ? previous.filter(item => item !== table) : [...previous, table].sort((a, b) => a - b))
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm" role="group" aria-label="Tabelluppdrag">
      {ASSIGNABLE_TABLES.map(table => (
        <button key={table} type="button" aria-pressed={tables.includes(table)} onClick={() => toggle(table)}
          className={`${CHIP} ${tables.includes(table) ? 'border-sky-600 bg-sky-600 text-white' : 'border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100'}`}>{table}</button>
      ))}
      <button type="button" disabled={tables.length === 0} onClick={() => { create({ kind: 'table', tables }); setTables([]) }}
        className={`${CHIP} border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200 disabled:opacity-40`}>Skapa tabelluppdrag</button>
    </div>
  )
}

// Focus exercises as an assignment. The results are only readable by a
// super admin, which the module's explanation says out loud.
export function AssignmentFocusPreset({ onCreated, breakGames, workspaces }) {
  const create = useCreator(onCreated, { breakGames, workspaces })
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm" role="group" aria-label="Fokusövning som uppdrag">
      {Object.entries(FOCUS_MODE_LABELS).map(([mode, label]) => (
        <button key={mode} type="button" onClick={() => create({ kind: 'focus', focusMode: mode })}
          className={`${CHIP} border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200`}>{label}</button>
      ))}
    </div>
  )
}
