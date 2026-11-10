import { useState } from 'react'
import { createAssignment } from '../../../lib/assignments'
import { OPERATION_LABELS } from '../../../lib/operations'
import { builderAssignment } from '../../../lib/assignmentBuilder'

const FIELD = 'rounded border border-gray-300 px-1.5 py-0.5 text-sm'
const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'percentage',
  'arithmetic_expressions', 'algebra_evaluate', 'algebra_simplify']
const LEVELS = Array.from({ length: 12 }, (_, index) => index + 1)
export default function AssignmentBuilder({ onCreated, breakGames, workspaces }) {
  const [form, setForm] = useState({ operation: 'multiplication', count: 8, mode: 'adaptive', from: 1, to: 6, level: 4 })
  const set = patch => setForm(value => ({ ...value, ...patch }))
  const levelSelect = (key, label) => <label className="flex items-center gap-1">{label}
    <select aria-label={label} className={FIELD} value={form[key]} onChange={event => set({ [key]: Number(event.target.value) })}>
      {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
    </select></label>
  return <fieldset className="mb-3 rounded border border-gray-200 px-2 py-1.5 text-sm" aria-label="Eget uppdrag">
    <legend className="px-1 font-medium text-gray-700">Eget uppdrag</legend>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <label className="flex items-center gap-1">Räknesätt
        <select aria-label="Räknesätt" className={FIELD} value={form.operation} onChange={event => set({ operation: event.target.value })}>
          {OPERATIONS.map(operation => <option key={operation} value={operation}>{OPERATION_LABELS[operation]}</option>)}
        </select></label>
      <label className="flex items-center gap-1">Antal
        <input aria-label="Antal uppgifter" type="number" min="1" max="200" className={`${FIELD} w-16`} value={form.count}
          onChange={event => set({ count: event.target.value })} /></label>
    </div>
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5" role="radiogroup" aria-label="Hur nivån väljs">
      {[['adaptive', 'Anpassad efter eleven'], ['staircase', 'Från lätt till svår'], ['fixed', 'Bestämd nivå']].map(([mode, label]) =>
        <label key={mode} className="flex items-center gap-1">
          <input type="radio" name="assignment-level-mode" checked={form.mode === mode} onChange={() => set({ mode })} />{label}</label>)}
      {form.mode === 'staircase' && <>{levelSelect('from', 'Från nivå')}{levelSelect('to', 'till')}</>}
      {form.mode === 'fixed' && levelSelect('level', 'Nivå')}
      <button type="button" className="rounded-md border border-sky-300 bg-sky-100 px-1.5 py-0.5 font-medium text-sky-900 hover:bg-sky-200"
        onClick={() => {
          const assignment = createAssignment({ ...builderAssignment(form), breakGames, ...(workspaces ? { workspaces } : {}) })
          if (assignment) onCreated(assignment)
        }}>Skapa uppdrag</button>
    </div>
    <p className="mt-1 text-xs text-gray-600">
      {form.mode === 'adaptive' ? 'Varje elev får frågor på sin nivå utifrån sin träning.'
        : form.mode === 'staircase' ? 'Börjar på lägsta nivån och blir svårare jämnt genom uppdraget.' : 'Alla frågor på samma nivå.'}</p>
  </fieldset>
}
