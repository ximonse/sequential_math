import PupilSearch from './PupilSearch.jsx'

export default function ClassFilterPanel({
  selectedClassIds,
  studentsCount,
  filteredStudentsCount,
  classFilterOptions,
  onClearClassFilter,
  onSelectAllClasses,
  onToggleClassFilter,
  collapseControl,
  students = [],
  classNameById,
  onPickPupil
}) {
  // "Alla klasser" is an explicit choice that loads every class; nothing is chosen
  // and nothing is loaded until the teacher picks (Simon 2026-11-03).
  const classOptionIds = classFilterOptions.filter(item => item.kind !== 'group').map(item => item.id)
  const allClassesSelected = classOptionIds.length > 0 && classOptionIds.every(id => selectedClassIds.includes(id))
  return (
    <section className="dashboard-class-filter bg-white rounded-lg shadow p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
        <h2 className="text-sm font-semibold text-gray-800">Välj din klass eller grupp</h2>
        <div className="flex items-center gap-2"><p className="text-xs text-gray-500">
          {selectedClassIds.length === 0
            ? `Välj en klass eller grupp för att se elevernas resultat (${studentsCount} elever totalt)`
            : `${selectedClassIds.length} klass/grupp(er) valda (${filteredStudentsCount} elever)`}
        </p>{collapseControl}</div>
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500">Valda klasser/grupper sparas som förval till nästa gång.</p>
        {onPickPupil && <PupilSearch students={students} classNameById={classNameById} onPick={onPickPupil} />}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onSelectAllClasses || onClearClassFilter}
          aria-pressed={allClassesSelected}
          className={`rounded-md px-1.5 py-0.5 text-xs ${allClassesSelected
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          {allClassesSelected && <span aria-hidden="true">✓ </span>}Alla klasser
        </button>
        {selectedClassIds.length > 0 && <button type="button" onClick={onClearClassFilter}
          className="rounded-md px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100">Rensa klassurval</button>}
        {classFilterOptions.length === 0 ? (
          <span className="text-xs text-gray-400">
            Inga klass-/grupptaggar hittades ännu.
          </span>
        ) : null}
        {classFilterOptions.map(item => (
          <button
            type="button"
            key={`top-filter-${item.id}`}
            onClick={() => onToggleClassFilter(item.id)}
            aria-pressed={selectedClassIds.includes(item.id)}
            className={`rounded-md px-1.5 py-0.5 text-xs ${selectedClassIds.includes(item.id)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {selectedClassIds.includes(item.id) && <span aria-hidden="true">✓ </span>}{item.name}
          </button>
        ))}
      </div>
    </section>
  )
}
