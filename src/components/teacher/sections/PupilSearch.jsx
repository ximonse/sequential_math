import { useId, useMemo, useState } from 'react'

// Find one pupil without knowing the class (Simon 2026-11-03). Matches the name the
// teacher sees (private name or code name) and the code name, across all classes.
export default function PupilSearch({ students, classNameById, onPick, label = 'Sök elev' }) {
  const [query, setQuery] = useState('')
  const listId = useId()
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('sv')
    if (needle.length < 2) return []
    return students.filter(pupil => [pupil.name, pupil.displayAlias, pupil.teacherPupilLabel]
      .some(value => String(value || '').toLocaleLowerCase('sv').includes(needle)))
      .slice(0, 8)
  }, [students, query])
  const pick = pupil => { setQuery(''); onPick(pupil) }
  return <div className="pupil-search relative" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setQuery('')
  }}>
    <label className="flex items-center gap-2 text-xs text-gray-700">
      <span className="font-semibold">{label}</span>
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-controls={listId}
        placeholder="Namn eller kodnamn" className="w-48 rounded border border-gray-300 px-1.5 py-0.5 text-sm"
        onKeyDown={event => {
          if (event.key === 'Escape') setQuery('')
          if (event.key === 'Enter' && matches[0]) { event.preventDefault(); pick(matches[0]) }
        }} />
    </label>
    {query.trim().length >= 2 && <ul id={listId} aria-label="Sökträffar" className="absolute z-20 mt-1 w-72 rounded border border-gray-300 bg-white py-1 shadow-lg">
      {matches.length ? matches.map(pupil => <li key={pupil.studentId}>
        <button type="button" onClick={() => pick(pupil)} className="flex w-full justify-between gap-2 px-2 py-1 text-left text-sm hover:bg-indigo-50">
          <span>{pupil.name || pupil.displayAlias}</span>
          <span className="text-xs text-gray-500">{(pupil.classIds || [pupil.classId]).map(id => classNameById?.get?.(String(id)) || pupil.className).filter(Boolean).join(', ')}</span>
        </button>
      </li>) : <li className="px-2 py-1 text-sm text-gray-500">Ingen elev matchar.</li>}
    </ul>}
  </div>
}
