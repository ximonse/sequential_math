import { useMemo, useState } from 'react'
import {
  getDefaultClassOverviewSortDir,
  getSortedClassOverviewRows
} from './dashboardSortUtils'

export default function ClassOverviewPanel({
  classOverviewMeta,
  rows,
  onOpenStudentDetail,
  ActivityBadgeComponent,
  getOperationLabel,
  toPercent,
  formatDuration,
  formatTimeAgo,
  className = 'bg-white rounded-lg shadow p-4 mb-8',
  style
}) {
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const sortedRows = useMemo(
    () => getSortedClassOverviewRows(rows, sortBy, sortDir),
    [rows, sortBy, sortDir]
  )

  const handleSort = (nextSortBy) => {
    if (sortBy === nextSortBy) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortBy(nextSortBy)
    setSortDir(getDefaultClassOverviewSortDir(nextSortBy))
  }

  const getSortIndicator = (sortKey) => {
    if (sortBy !== sortKey) return '↕'
    return sortDir === 'asc' ? '▲' : '▼'
  }

  return (
    <div className={className} style={style}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Klass/gruppvy - snabbstatus</h2>
        <span className="text-xs text-gray-500">Styrs av urvalet högst upp</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        {classOverviewMeta.className}: {classOverviewMeta.activeNowCount}/{classOverviewMeta.studentCount} aktiv(a) just nu
      </p>
      <p className="text-[11px] text-gray-400 mb-3">
        Status: Grön = fokus + aktivitet senaste 2 min, Orange = fokus men ingen aktivitet 2-4 min, Svart = inne idag men ej aktiv nu, Röd = ej inne idag.
      </p>
      {sortedRows.length === 0 ? (
        <p className="text-sm text-gray-500">Inga elever hittades i valt urval.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <SortableHeader label="Elev" sortKey="name" onSort={handleSort} getSortIndicator={getSortIndicator} />
                <SortableHeader label="Status" sortKey="activity" onSort={handleSort} getSortIndicator={getSortIndicator} />
                <SortableHeader label="Jobbar med" sortKey="operation" onSort={handleSort} getSortIndicator={getSortIndicator} />
                <SortableHeader label="Idag" sortKey="today_attempts" onSort={handleSort} getSortIndicator={getSortIndicator} />
                <SortableHeader label="Rätt/Fel idag" sortKey="today_wrong" onSort={handleSort} getSortIndicator={getSortIndicator} />
                <SortableHeader label="Träff idag" sortKey="today_success" onSort={handleSort} getSortIndicator={getSortIndicator} />
                <SortableHeader
                  label="Tid på uppgift idag"
                  sortKey="today_engaged"
                  onSort={handleSort}
                  getSortIndicator={getSortIndicator}
                />
                <SortableHeader
                  label="Senast aktiv"
                  sortKey="last_active"
                  onSort={handleSort}
                  getSortIndicator={getSortIndicator}
                  className="py-1"
                />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={`overview-row-${row.studentId}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2 text-gray-700 font-medium">
                    <button
                      type="button"
                      onClick={() => onOpenStudentDetail(row.studentId)}
                      className="text-left hover:underline text-indigo-700 font-medium"
                    >
                      {row.name}
                    </button>
                    <span className="ml-1 text-xs text-gray-400">{row.studentId}</span>
                  </td>
                  <td className="py-1 pr-2">
                    <ActivityBadgeComponent code={row.activityStatus} compact />
                  </td>
                  <td className="py-1 pr-2 text-gray-700">{getOperationLabel(row.focusOperation)}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.todayAttempts}</td>
                  <td className="py-1 pr-2 text-gray-700">
                    {row.todayCorrectCount}/{row.todayWrongCount}
                  </td>
                  <td className="py-1 pr-2 text-gray-700">{toPercent(row.todaySuccessRate)}</td>
                  <td className="py-1 pr-2 text-gray-700">{formatDuration(row.todayEngagedMinutes * 60)}</td>
                  <td className="py-1 text-gray-700">{formatTimeAgo(row.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SortableHeader({ label, sortKey, onSort, getSortIndicator, className = 'py-1 pr-2' }) {
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-gray-700"
      >
        {label}
        <span className="text-[10px] text-gray-400">{getSortIndicator(sortKey)}</span>
      </button>
    </th>
  )
}
