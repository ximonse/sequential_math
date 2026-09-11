export default function ClassFilterPanel({
  selectedClassIds,
  studentsCount,
  filteredStudentsCount,
  classFilterOptions,
  onClearClassFilter,
  onToggleClassFilter
}) {
  return (
    <section className="dashboard-class-filter bg-white rounded-lg shadow p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
        <h2 className="text-sm font-semibold text-gray-800">Välj din klass eller grupp</h2>
        <p className="text-xs text-gray-500">
          {selectedClassIds.length === 0
            ? `Alla klasser/grupper (${studentsCount} elever)`
            : `${selectedClassIds.length} klass/grupp(er) valda (${filteredStudentsCount} elever)`}
        </p>
      </div>
      <p className="mb-2 text-[11px] text-gray-500">
        Valda klasser/grupper sparas som förval till nästa gång.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onClearClassFilter}
          className={`rounded-md px-2 py-1 text-xs ${selectedClassIds.length === 0
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Alla klasser
        </button>
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
            className={`rounded-md px-2 py-1 text-xs ${selectedClassIds.includes(item.id)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </section>
  )
}
