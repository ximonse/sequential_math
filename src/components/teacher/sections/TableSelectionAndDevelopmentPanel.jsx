export default function TableSelectionAndDevelopmentPanel({
  tableSelectedStudentIds,
  filteredStudentsCount,
  onClearTableSelection,
  tableStudentSearch,
  onSetTableStudentSearch,
  filteredTableStudentOptions,
  tableStudentSet,
  onToggleTableStudent,
  tableDevelopmentOverview,
  toPercent
}) {
  return (
    <div className="grid grid-cols-1 gap-4 mb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h2 className="text-lg font-semibold text-gray-800">Gångertabell - urval</h2>
          <p className="text-xs text-gray-500">
            {tableSelectedStudentIds.length === 0
              ? `Alla elever i klassurvalet (${filteredStudentsCount})`
              : `${tableSelectedStudentIds.length} vald(a) elev(er)`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            onClick={onClearTableSelection}
            className={`px-2.5 py-1.5 rounded text-xs ${tableSelectedStudentIds.length === 0
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Alla i klassurvalet
          </button>
          <input
            value={tableStudentSearch}
            onChange={(event) => onSetTableStudentSearch(event.target.value)}
            placeholder="Filtrera elev"
            className="px-2.5 py-1.5 border rounded text-xs min-w-48"
          />
        </div>
        <div className="max-h-28 overflow-y-auto border rounded divide-y">
          {filteredTableStudentOptions.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-gray-500">Inga elever matchar filtret.</p>
          ) : (
            filteredTableStudentOptions.slice(0, 120).map(item => {
              const selected = tableStudentSet.has(item.studentId)
              return (
                <button
                  key={`table-student-filter-${item.studentId}`}
                  onClick={() => onToggleTableStudent(item.studentId)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs ${selected
                    ? 'bg-indigo-100 text-indigo-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {item.name} <span className="text-gray-500">({item.className || 'Ingen klass'})</span>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Gångertabell - utveckling (7 dagar)</h2>
          <span className="text-xs text-gray-500">Jämfört med föregående 7 dagar</span>
        </div>
        {tableDevelopmentOverview.length === 0 ? (
          <p className="text-sm text-gray-500">Ingen tabellaktivitet i aktuellt urval.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1 pr-2">Tabell</th>
                  <th className="py-1 pr-2">Försök 7d</th>
                  <th className="py-1 pr-2">Träff 7d</th>
                  <th className="py-1 pr-2">Trend träff</th>
                  <th className="py-1 pr-2">Median tid 7d</th>
                  <th className="py-1">Trend tid</th>
                </tr>
              </thead>
              <tbody>
                {tableDevelopmentOverview.map(item => (
                  <tr key={`table-dev-${item.table}`} className="border-b last:border-b-0">
                    <td className="py-1 pr-2 font-medium text-gray-700">{item.table}:an</td>
                    <td className="py-1 pr-2 text-gray-700">{item.attempts7d}</td>
                    <td className="py-1 pr-2 text-gray-700">{toPercent(item.accuracy7d)}</td>
                    <td className="py-1 pr-2 text-gray-700">
                      {item.accuracyTrend === null
                        ? '-'
                        : `${item.accuracyTrend >= 0 ? '+' : ''}${Math.round(item.accuracyTrend * 100)} pp`}
                    </td>
                    <td className="py-1 pr-2 text-gray-700">
                      {Number.isFinite(item.medianTime7d) ? `${item.medianTime7d.toFixed(1)}s` : '-'}
                    </td>
                    <td className="py-1 text-gray-700">
                      {item.speedTrend === null
                        ? '-'
                        : `${item.speedTrend >= 0 ? '+' : ''}${Math.round(item.speedTrend * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
