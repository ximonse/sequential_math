export default function ClassFilterPanel({
  selectedClassIds,
  studentsCount,
  filteredStudentsCount,
  classFilterOptions,
  onClearClassFilter,
  onToggleClassFilter
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6" style={{ order: -70 }}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="text-base font-semibold text-gray-800">Urval: klass/grupp</h2>
        <p className="text-xs text-gray-500">
          {selectedClassIds.length === 0
            ? `Alla klasser/grupper (${studentsCount} elever)`
            : `${selectedClassIds.length} klass/grupp(er) valda (${filteredStudentsCount} elever)`}
        </p>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">
        Valda klasser/grupper sparas som förval till nästa gång.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onClearClassFilter}
          className={`px-2 py-1 rounded text-xs ${selectedClassIds.length === 0
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
            className={`px-2 py-1 rounded text-xs ${selectedClassIds.includes(item.id)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  )
}
