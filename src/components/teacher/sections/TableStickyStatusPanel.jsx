function TableStickyStatusPanel({
  rows,
  tables,
  onSort,
  onOpenStudentDetail,
  getSortIndicator,
  getStatusClass,
  getStatusLabel,
  className = 'bg-white rounded-lg shadow p-4',
  style
}) {
  return (
    <div className={className} style={style}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Gångertabell - sticky status per elev</h2>
        <span className="text-xs text-gray-500">Dag (mörkgrön) låser till 23:59, vecka (ljusgrön) till söndag</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Inga elever i aktuellt urval.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSort('name')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Elev
                    <span className="text-[10px] text-gray-400">{getSortIndicator('name')}</span>
                  </button>
                </th>
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSort('class')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Klass
                    <span className="text-[10px] text-gray-400">{getSortIndicator('class')}</span>
                  </button>
                </th>
                {tables.map(table => (
                  <th key={`teacher-table-sticky-head-${table}`} className="py-1 pr-1 text-center">
                    <button
                      type="button"
                      onClick={() => onSort(`table_${table}`)}
                      className="inline-flex items-center justify-center gap-1 hover:text-gray-700"
                    >
                      <span>{table}</span>
                      <span className="text-[10px] text-gray-400">{getSortIndicator(`table_${table}`)}</span>
                    </button>
                  </th>
                ))}
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSort('today_done')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Dagsklara
                    <span className="text-[10px] text-gray-400">{getSortIndicator('today_done')}</span>
                  </button>
                </th>
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSort('week_done')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Veckoklara
                    <span className="text-[10px] text-gray-400">{getSortIndicator('week_done')}</span>
                  </button>
                </th>
                <th className="py-1">
                  <button
                    type="button"
                    onClick={() => onSort('star_count')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Star idag
                    <span className="text-[10px] text-gray-400">{getSortIndicator('star_count')}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`teacher-table-sticky-row-${row.studentId}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2 text-gray-700 font-medium">
                    <button
                      type="button"
                      onClick={() => onOpenStudentDetail(row.studentId)}
                      className="text-left hover:underline text-indigo-700 font-medium"
                    >
                      {row.name}
                    </button>
                  </td>
                  <td className="py-1 pr-2 text-gray-600">{row.className || '-'}</td>
                  {tables.map(table => (
                    <td key={`teacher-table-sticky-cell-${row.studentId}-${table}`} className="py-1 pr-1 text-center">
                      <span className={`inline-flex w-5 h-5 rounded border align-middle ${getStatusClass(row.statusByTable[table])}`} title={getStatusLabel(row.statusByTable[table])}>
                        {row.statusByTable[table] === 'star' ? (
                          <span className="m-auto text-[10px] text-yellow-300">★</span>
                        ) : null}
                      </span>
                    </td>
                  ))}
                  <td className="py-1 pr-2 text-gray-700">{row.todayDoneCount}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.weekDoneCount}</td>
                  <td className="py-1 text-gray-700">{row.starCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TableStickyStatusPanel
