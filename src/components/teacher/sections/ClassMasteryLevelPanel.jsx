import { useMemo, useState } from 'react'
import { getOperationLabel } from '../../../lib/operations'
import { ALL_OPERATIONS } from './dashboardConstants'
import {
  buildClassMasteryRows,
  getLevelColorClass,
  getAverageColorClass
} from './dashboardClassMasteryHelpers'

const SHORT_LABELS = {
  addition: '+',
  subtraction: '\u2212',
  multiplication: '\u00d7',
  division: '\u00f7',
  algebra_evaluate: 'Alg(u)',
  algebra_simplify: 'Alg(f)',
  arithmetic_expressions: 'Uttr',
  fractions: 'Br\u00e5k',
  percentage: '%'
}

export default function ClassMasteryLevelPanel({
  filteredStudents,
  onOpenStudentDetail
}) {
  const [sortBy, setSortBy] = useState('average')
  const [sortDir, setSortDir] = useState('asc')

  const rows = useMemo(
    () => buildClassMasteryRows(filteredStudents),
    [filteredStudents]
  )

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      if (sortBy === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''), 'sv')
      }
      if (sortBy === 'average') {
        return a.average - b.average
      }
      const aVal = a.levels[sortBy] || 0
      const bVal = b.levels[sortBy] || 0
      return aVal - bVal
    })
    return sortDir === 'asc' ? sorted : sorted.reverse()
  }, [rows, sortBy, sortDir])

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir(column === 'name' ? 'asc' : 'asc')
    }
  }

  const sortIndicator = (column) => {
    if (sortBy !== column) return ''
    return sortDir === 'asc' ? ' \u25b2' : ' \u25bc'
  }

  if (!filteredStudents || filteredStudents.length === 0) {
    return <p className="text-sm text-gray-500">Inga elever i urvalet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-300">
            <SortableHeader
              label="Elev"
              column="name"
              sortBy={sortBy}
              indicator={sortIndicator('name')}
              onClick={handleSort}
              className="text-left min-w-28"
            />
            {ALL_OPERATIONS.map(op => (
              <SortableHeader
                key={op}
                label={SHORT_LABELS[op] || op}
                column={op}
                sortBy={sortBy}
                indicator={sortIndicator(op)}
                onClick={handleSort}
                title={getOperationLabel(op)}
                className="text-center w-12"
              />
            ))}
            <SortableHeader
              label="Snitt"
              column="average"
              sortBy={sortBy}
              indicator={sortIndicator('average')}
              onClick={handleSort}
              className="text-center w-14"
              title="Genomsnitt av alla operationer med tr\u00e4ning"
            />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map(row => (
            <tr key={row.studentId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-1 pr-2">
                <button
                  onClick={() => onOpenStudentDetail?.(row.studentId)}
                  className="text-left text-blue-700 hover:underline font-medium truncate max-w-40 block"
                  title={row.name}
                >
                  {row.name}
                </button>
              </td>
              {ALL_OPERATIONS.map(op => {
                const level = row.levels[op]
                const colorClass = getLevelColorClass(level)
                const tooltip = level > 0
                  ? `${getOperationLabel(op)}: niv\u00e5 1\u2013${level} klarade`
                  : `${getOperationLabel(op)}: ingen niv\u00e5 klarad \u00e4nnu`
                return (
                  <td key={op} className="py-1 px-0.5 text-center">
                    <span
                      title={tooltip}
                      className={`inline-flex h-7 w-9 items-center justify-center rounded text-[10px] font-bold cursor-default ${colorClass}`}
                    >
                      {level > 0 ? level : '\u2013'}
                    </span>
                  </td>
                )
              })}
              <td className="py-1 text-center">
                <span className={`text-[11px] ${getAverageColorClass(row.average)}`}>
                  {row.average > 0 ? row.average.toFixed(1) : '\u2013'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-500 mt-2">
        Effektiv niv\u00e5 = h\u00f6gsta sammanh\u00e4ngande klarade niv\u00e5n (niv\u00e5 1\u20133 klarade men ej 4 \u2192 visar 3). Klarad = \u2265{5} f\u00f6rs\u00f6k, \u2265{85}% r\u00e4tt.
      </p>
    </div>
  )
}

function SortableHeader({ label, column, sortBy, indicator, onClick, className = '', title = '' }) {
  const isActive = sortBy === column
  return (
    <th
      className={`py-1.5 px-1 cursor-pointer select-none whitespace-nowrap ${className} ${isActive ? 'text-gray-900' : 'text-gray-500'}`}
      onClick={() => onClick(column)}
      title={title || label}
    >
      {label}{indicator}
    </th>
  )
}
