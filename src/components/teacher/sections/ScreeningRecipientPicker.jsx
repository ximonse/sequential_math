import { Fragment, useId, useMemo, useState } from 'react'
import { normalizeRecipientSearch, recipientChoices, recipientKey, resolveRecipientSelection } from './recipientSelection'

const PAGE_SIZE = 8
const TYPE_LABELS = { class: 'Klasser', group: 'Grupper', student: 'Elever' }
const TYPE_SHORT = { class: 'Klass', group: 'Grupp', student: 'Elev' }

export default function ScreeningRecipientPicker({ classes, groups, students, recipients, onChange, disabled = false, title = 'Mottagare' }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const context = useMemo(() => ({ classes, groups, students }), [classes, groups, students])
  const choices = useMemo(() => recipientChoices(context), [context])
  const selection = useMemo(() => resolveRecipientSelection(recipients, context), [recipients, context])
  const picked = new Set(recipients.map(recipientKey))
  const matches = choices.filter(item => (type === 'all' || item.type === type)
    && normalizeRecipientSearch(`${item.name} ${item.detail}`).includes(normalizeRecipientSearch(query)))
  const toggle = item => onChange(picked.has(recipientKey(item))
    ? recipients.filter(pick => recipientKey(pick) !== recipientKey(item))
    : [...recipients, { type: item.type, id: item.id }])

  return <section aria-labelledby={`${id}-title`} data-screening-picker className="text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id={`${id}-title`} className="text-base font-semibold text-slate-900">{title}</h3>
      <button type="button" disabled={disabled || !recipients.length} className="text-indigo-700 underline disabled:opacity-50" onClick={() => onChange([])}>Rensa urval</button>
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      {selection.selected.map(item => <span key={recipientKey(item)} className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-900">
        <span className="text-xs text-indigo-700">{TYPE_SHORT[item.type]}</span>{item.name}<button type="button" disabled={disabled} onClick={() => toggle(item)} className="screening-remove px-1" aria-label={`Ta bort ${item.name}`}>×</button>
      </span>)}
    </div>
    <p data-recipient-summary role="status" className="mt-2 font-semibold text-indigo-800">{recipients.length ? selection.pupils.length === 1 ? '1 elev' : `${selection.pupils.length} unika elever` : 'Ingen mottagare vald.'}</p>
    {(selection.missing > 0 || selection.unavailablePupils > 0) && <p role="alert" className="text-amber-900">Urvalet innehåller mottagare som inte längre finns i underlaget. Läs om listan och kontrollera urvalet innan utdelning.</p>}
    {selection.pupils.length > 0 && <details className="mt-1"><summary className="cursor-pointer">Visa elever som ingår</summary>
      <ul className="mt-1 grid gap-x-4 sm:grid-cols-2">{selection.pupils.map(student => <li key={student.studentId}>{student.name || student.displayAlias || 'Elev utan namn'}</li>)}</ul>
    </details>}
    <div className="mb-2 mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
      <label htmlFor={`${id}-search`}>Sök klass, grupp eller elev<input id={`${id}-search`} type="search" value={query} disabled={disabled}
        onChange={event => { setQuery(event.target.value); setLimit(PAGE_SIZE) }} placeholder="Namn, klass eller grupp"
        className="block w-full rounded border border-slate-400 bg-white px-2 py-0.5" /></label>
      <label htmlFor={`${id}-type`}>Visa<select id={`${id}-type`} value={type} disabled={disabled} onChange={event => { setType(event.target.value); setLimit(PAGE_SIZE) }}
        className="block w-full rounded border border-slate-400 bg-white px-1 py-0.5">
        <option value="all">Alla typer</option><option value="class">Klasser</option><option value="group">Grupper</option><option value="student">Elever</option>
      </select></label>
    </div>
    <div className="border-b border-slate-200">{matches.slice(0, limit).map((item, index) => <Fragment key={recipientKey(item)}>
      {(index === 0 || matches[index - 1].type !== item.type) && <h4 className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{TYPE_LABELS[item.type]}</h4>}
      <label className={`screening-target-row flex cursor-pointer items-center gap-2 rounded-sm border-t border-slate-100 px-1 py-1 ${picked.has(recipientKey(item)) ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
      <input type="checkbox" aria-label={item.label} disabled={disabled} checked={picked.has(recipientKey(item))} onChange={() => toggle(item)} className="h-4 w-4 shrink-0 accent-indigo-600" />
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2"><span>{item.name}</span><span className="text-xs text-slate-600">{item.detail}</span></span>
    </label></Fragment>)}</div>
    {!matches.length && <p className="py-1">Inga träffar.</p>}
    {matches.length > limit && <button type="button" disabled={disabled} className="mt-1 text-indigo-700 underline" onClick={() => setLimit(value => value + PAGE_SIZE)}>Visa fler ({matches.length - limit} kvar)</button>}
  </section>
}
