export default function StudentHomeTableDrillCard({
  tables,
  selectedTables,
  tableStatus,
  onToggleTable,
  getTableStatusClass,
  onStartTableDrill
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
      <h2 className="text-base font-semibold text-gray-800 mb-3">Tabellövning - mängdträning</h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
        {tables.map(table => (
          <button
            key={table}
            type="button"
            onClick={() => onToggleTable(table)}
            className={`h-11 rounded-lg border-2 text-sm font-semibold relative ${
              selectedTables.includes(table)
                ? 'border-orange-500'
                : 'border-gray-200'
            } ${getTableStatusClass(tableStatus[table])}`}
          >
            {table}
            {tableStatus[table] === 'star' && (
              <span className="absolute -top-1 -right-1 text-yellow-500 text-sm" aria-hidden="true">★</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Välj en eller flera tabeller och tryck Kör.
        </p>
        <button
          type="button"
          onClick={onStartTableDrill}
          disabled={selectedTables.length === 0}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold"
        >
          Kör
        </button>
      </div>
    </div>
  )
}
