import { useMemo, useState } from 'react'
import { getOperationLabel } from '../../../lib/operations'
import { ALL_OPERATIONS } from './dashboardConstants'
import {
  buildClassMasteryAverages,
  buildClassMasteryExportRows,
  buildClassMasteryRows,
  getLevelDotStyle,
  getAverageBadgeStyle
} from './dashboardClassMasteryHelpers'
import { downloadTextFile, rowsToCsv } from './dashboardExportHelpers'

const SHORT_LABELS = {
  addition: '+',
  subtraction: '−',
  multiplication: '×',
  division: '÷',
  algebra_evaluate: 'Alg(u)',
  algebra_simplify: 'Alg(f)',
  arithmetic_expressions: 'Uttr',
  fractions: 'Bråk',
  percentage: '%'
}

const LEGEND_STEPS = [
  { level: 0, label: '–' },
  { level: 2, label: '1-2' },
  { level: 4, label: '3-4' },
  { level: 6, label: '5-6' },
  { level: 8, label: '7-8' },
  { level: 10, label: '9-10' },
  { level: 12, label: '11-12' }
]

export default function ClassMasteryLevelPanel({
  filteredStudents,
  onOpenStudentDetail
}) {
  const [sortBy, setSortBy] = useState('average')
  const [sortDir, setSortDir] = useState('desc')

  const rows = useMemo(
    () => buildClassMasteryRows(filteredStudents),
    [filteredStudents]
  )

  const classAverages = useMemo(() => {
    return buildClassMasteryAverages(rows)
  }, [rows])

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      if (sortBy === 'name') {
        const cmp = String(a.name || '').localeCompare(String(b.name || ''), 'sv')
        return sortDir === 'asc' ? cmp : -cmp
      }
      let aVal, bVal
      if (sortBy === 'average') { aVal = a.average; bVal = b.average }
      else if (sortBy === 'lowest') { aVal = a.lowest; bVal = b.lowest }
      else { aVal = a.levels[sortBy]; bVal = b.levels[sortBy] }
      if (!Number.isFinite(aVal)) return Number.isFinite(bVal) ? 1 : 0
      if (!Number.isFinite(bVal)) return -1
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return sorted
  }, [rows, sortBy, sortDir])

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDir(column === 'name' ? 'asc' : 'desc')
    }
  }

  const handleExport = () => {
    const csvRows = buildClassMasteryExportRows(sortedRows, classAverages, getOperationLabel)
    if (csvRows.length === 0) return
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadTextFile(rowsToCsv(csvRows), `nivaoversikt_${stamp}.csv`, 'text/csv;charset=utf-8;')
  }

  const sortArrow = (column) => {
    if (sortBy !== column) return null
    return (
      <span className="text-[9px] ml-0.5 opacity-70">
        {sortDir === 'asc' ? '▲' : '▼'}
      </span>
    )
  }

  return (
    <section className="mb-8 rounded-lg bg-white p-4 shadow">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Nivåöversikt – hela klassen</h2>
          <p className="text-xs text-gray-500">Belagd nivå i aktiverade kunskapsområden per elev.</p>
        </div>
        {filteredStudents?.length > 0 ? (
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
          >
            Exportera nivåöversikt
          </button>
        ) : null}
      </div>
      {!filteredStudents || filteredStudents.length === 0 ? <p className="text-sm text-gray-500">Inga elever i urvalet.</p> : (
    <div className="space-y-1">
      {/* Header with legend */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-1 pb-1">
        <p className="text-xs text-gray-400">
          Klarad = ≥5 försök, ≥85% rätt. Konsekutiv från nivå 1. – = ännu inte belagt.
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-400 mr-0.5">Nivå:</span>
          {LEGEND_STEPS.map(({ level, label }) => (
            <span key={level} className="inline-flex items-center gap-0.5">
              <span
                className="inline-block w-3.5 h-3.5 rounded"
                style={getLevelDotStyle(level)}
              />
              <span className="text-[10px] text-gray-500">{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50/80">
              <HeaderCell
                label="Elev"
                column="name"
                active={sortBy === 'name'}
                arrow={sortArrow('name')}
                onClick={handleSort}
                className="text-left min-w-36 pl-3"
              />
              {ALL_OPERATIONS.map(op => (
                <HeaderCell
                  key={op}
                  label={SHORT_LABELS[op] || op}
                  column={op}
                  active={sortBy === op}
                  arrow={sortArrow(op)}
                  onClick={handleSort}
                  title={getOperationLabel(op)}
                  className="text-center w-14"
                />
              ))}
              <HeaderCell
                label="Lägsta belagda"
                column="lowest"
                active={sortBy === 'lowest'}
                arrow={sortArrow('lowest')}
                onClick={handleSort}
                className="text-center w-16 border-l border-gray-200"
                title="Lägsta belagda nivå bland områden med tillräckligt underlag"
              />
              <HeaderCell
                label="Snitt belagt"
                column="average"
                active={sortBy === 'average'}
                arrow={sortArrow('average')}
                onClick={handleSort}
                className="text-center w-16 border-l border-gray-100"
                title="Snitt av belagda områden; okända områden räknas inte som nivå 0"
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr
                key={row.studentId}
                className={`group border-b border-gray-50 transition-colors hover:bg-blue-50/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'}`}
              >
                <td className="py-1.5 pl-3 pr-3">
                  <button
                    onClick={() => onOpenStudentDetail?.(row.studentId)}
                    className="text-left text-[13px] text-gray-800 group-hover:text-blue-700 font-medium truncate max-w-44 block transition-colors"
                    title={row.name}
                  >
                    {row.name}
                  </button>
                </td>
                {ALL_OPERATIONS.map(op => {
                  const level = row.levels[op]
                  const tooltip = level > 0
                    ? `${getOperationLabel(op)}: nivå 1–${level} klarade`
                    : `${getOperationLabel(op)}: ännu inte belagd`
                  return (
                    <td key={op} className="py-1.5 px-1 text-center">
                      <LevelDot level={level} tooltip={tooltip} />
                    </td>
                  )
                })}
                <td className="py-1.5 px-1.5 text-center border-l border-gray-200">
                  <BadgeDot value={row.lowest} />
                </td>
                <td className="py-1.5 px-1.5 text-center border-l border-gray-100">
                  <BadgeDot
                    value={row.average}
                    decimal
                    tooltip={`${row.knownCount}/${row.totalCount} områden har belagd nivå`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Class average footer */}
          {classAverages && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/60">
                <td className="py-2 pl-3 pr-3">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Klassmedel</span>
                </td>
                {ALL_OPERATIONS.map(op => (
                  <td key={op} className="py-2 px-1 text-center">
                    <BadgeDot value={classAverages[op]} decimal />
                  </td>
                ))}
                <td className="py-2 px-1.5 text-center border-l border-gray-200">
                  <BadgeDot value={classAverages._lowest} decimal />
                </td>
                <td className="py-2 px-1.5 text-center border-l border-gray-100">
                  <BadgeDot value={classAverages._total} decimal />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
      )}
    </section>
  )
}

function LevelDot({ level, tooltip }) {
  const style = getLevelDotStyle(level)
  return (
    <div
      title={tooltip}
      className="w-[38px] h-[34px] mx-auto rounded-md flex items-center justify-center text-[13px] font-bold tabular-nums cursor-default transition-transform hover:scale-110"
      style={style}
    >
      {level > 0 ? level : '–'}
    </div>
  )
}

function BadgeDot({ value, decimal = false, tooltip = '' }) {
  const style = getAverageBadgeStyle(value)
  const display = value > 0
    ? (decimal ? value.toFixed(1) : value)
    : '–'
  return (
    <div
      title={tooltip}
      className="w-[42px] h-[34px] mx-auto rounded-lg flex items-center justify-center text-[13px] font-extrabold tabular-nums"
      style={style}
    >
      {display}
    </div>
  )
}

function HeaderCell({ label, column, active, arrow, onClick, className = '', title = '' }) {
  return (
    <th
      className={`py-2 px-1 text-[11px] font-semibold cursor-pointer select-none whitespace-nowrap border-b-2 transition-colors ${className} ${active ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
      onClick={() => onClick(column)}
      title={title || label}
    >
      {label}{arrow}
    </th>
  )
}
