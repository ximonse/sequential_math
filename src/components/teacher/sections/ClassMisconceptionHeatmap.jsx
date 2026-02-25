import { useMemo, useState } from 'react'
import { inferOperationFromProblemType } from '../../../lib/mathUtils'
import { getOperationLabel } from '../../../lib/operations'

const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1)
const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division']

const OPERATION_ACCENT = {
  addition:       'bg-blue-500',
  subtraction:    'bg-violet-500',
  multiplication: 'bg-orange-500',
  division:       'bg-teal-500'
}

const CELL_CLASSES = {
  empty:     'bg-gray-50 border-gray-200 text-gray-300 cursor-default',
  mastered:  'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 cursor-default',
  progress:  'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 cursor-default',
  struggling:'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 cursor-default',
  concern:   'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 cursor-default'
}

function getCellVariant(successRate, attempts) {
  if (!attempts || successRate === null) return 'empty'
  if (successRate >= 0.85) return 'mastered'
  if (successRate >= 0.60) return 'progress'
  if (successRate >= 0.40) return 'struggling'
  return 'concern'
}

function buildHeatmapData(students) {
  const byOperation = Object.fromEntries(OPERATIONS.map(op => [op, new Map()]))

  for (const student of students) {
    const problems = Array.isArray(student.recentProblems) ? student.recentProblems : []
    for (const problem of problems) {
      const op = inferOperationFromProblemType(problem.problemType || '', {
        fallback: null,
        allowUnknownPrefix: false
      })
      if (!op || !byOperation[op]) continue

      const level = Math.round(Number(problem?.difficulty?.conceptual_level || 0))
      if (!Number.isInteger(level) || level < 1 || level > 12) continue

      if (!byOperation[op].has(student.studentId)) {
        byOperation[op].set(student.studentId, {
          studentId: student.studentId,
          name: student.name,
          levelData: {}
        })
      }
      const entry = byOperation[op].get(student.studentId)
      if (!entry.levelData[level]) {
        entry.levelData[level] = { attempts: 0, correct: 0, knowledgeWrong: 0, patternCounts: {} }
      }
      const cell = entry.levelData[level]
      cell.attempts += 1
      if (problem.correct) cell.correct += 1
      const errCat = String(problem.errorCategory || '')
      if (!problem.correct && (errCat === 'knowledge' || errCat === 'misconception')) {
        cell.knowledgeWrong += 1
        if (errCat === 'misconception') cell.misconceptionCount = (cell.misconceptionCount || 0) + 1
        const patterns = Array.isArray(problem.patterns) ? problem.patterns : []
        for (const p of patterns) {
          cell.patternCounts[p] = (cell.patternCounts[p] || 0) + 1
        }
      }
    }
  }

  return Object.fromEntries(OPERATIONS.map(op => {
    const rows = Array.from(byOperation[op].values())
      .map(entry => ({
        studentId: entry.studentId,
        name: entry.name,
        cells: LEVELS.map(level => {
          const d = entry.levelData[level]
          if (!d || d.attempts === 0) return { level, attempts: 0, successRate: null, knowledgeWrong: 0, misconceptionCount: 0, topPatterns: [] }
          const topPatterns = Object.entries(d.patternCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([p]) => p)
          return {
            level,
            attempts: d.attempts,
            correct: d.correct,
            successRate: d.correct / d.attempts,
            knowledgeWrong: d.knowledgeWrong,
            misconceptionCount: d.misconceptionCount || 0,
            topPatterns
          }
        })
      }))
      .filter(row => row.cells.some(c => c.attempts > 0))
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'))

    return [op, rows]
  }))
}

function CellTooltip({ cell, studentName }) {
  const pct = Math.round(cell.successRate * 100)
  return (
    <div className="pointer-events-none absolute z-20 bottom-full left-1/2 mb-1.5 -translate-x-1/2 w-max max-w-56 rounded border border-gray-200 bg-white shadow-lg px-2.5 py-1.5 text-left">
      <p className="text-[11px] font-semibold text-gray-800 leading-snug">{studentName} &middot; Nivå {cell.level}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">
        {pct}% rätt &middot; {cell.attempts} försök
        {cell.knowledgeWrong > 0 && ` · ${cell.knowledgeWrong} kunskapsfel`}
      </p>
      {cell.misconceptionCount > 0 && (
        <p className="text-[10px] text-red-600 font-semibold mt-0.5">⚠ {cell.misconceptionCount} missuppfattning{cell.misconceptionCount > 1 ? 'ar' : ''}</p>
      )}
      {cell.topPatterns.length > 0 && (
        <p className="text-[10px] text-orange-600 mt-0.5 font-mono">{cell.topPatterns.join(', ')}</p>
      )}
    </div>
  )
}

function OperationGrid({ operation, rows, onOpenStudentDetail }) {
  const [hoveredKey, setHoveredKey] = useState(null)

  if (rows.length === 0) {
    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-1 h-4 rounded-sm ${OPERATION_ACCENT[operation]}`} />
          <span className="text-xs font-semibold text-gray-700">{getOperationLabel(operation)}</span>
          <span className="text-xs text-gray-300">— ingen data</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1 h-4 rounded-sm ${OPERATION_ACCENT[operation]}`} />
        <span className="text-xs font-semibold text-gray-700">{getOperationLabel(operation)}</span>
        <span className="text-xs text-gray-400">{rows.length} elever</span>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-28 min-w-28 text-left pb-1 pr-3">
                <span className="text-[10px] text-gray-400 font-normal">Elev</span>
              </th>
              {LEVELS.map(level => (
                <th key={level} className="w-7 min-w-7 text-center pb-1 px-0.5">
                  <span className="text-[10px] text-gray-400 font-normal">{level}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.studentId}>
                <td className="pr-3 py-0.5 align-middle">
                  <button
                    type="button"
                    onClick={() => onOpenStudentDetail(row.studentId)}
                    className="text-left text-[11px] text-gray-700 hover:text-blue-600 hover:underline font-medium truncate max-w-[6.5rem] block leading-none py-0.5"
                  >
                    {row.name}
                  </button>
                </td>
                {row.cells.map(cell => {
                  const variant = getCellVariant(cell.successRate, cell.attempts)
                  const key = `${row.studentId}-${cell.level}`
                  const isHovered = hoveredKey === key
                  return (
                    <td key={cell.level} className="px-0.5 py-0.5 align-middle">
                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                      >
                        <div className={`h-7 w-7 flex items-center justify-center rounded border text-[9px] font-semibold leading-none transition-colors ${CELL_CLASSES[variant]}`}>
                          {cell.attempts > 0 ? `${Math.round(cell.successRate * 100)}` : ''}
                        </div>
                        {isHovered && cell.attempts > 0 && (
                          <CellTooltip cell={cell} studentName={row.name} />
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ClassMisconceptionHeatmap({ filteredStudents, onOpenStudentDetail }) {
  const heatmapData = useMemo(
    () => buildHeatmapData(Array.isArray(filteredStudents) ? filteredStudents : []),
    [filteredStudents]
  )

  const hasAnyData = OPERATIONS.some(op => heatmapData[op].length > 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
        <h2 className="text-sm font-semibold text-gray-800">Missuppfattningar — klassöversikt</h2>
        <span className="text-[11px] text-gray-400">Hover för detaljer &middot; klicka elevnamn för att öppna eleven</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {[
          { label: '≥85% rätt', cls: 'bg-emerald-50 border-emerald-300' },
          { label: '60–84%',    cls: 'bg-amber-50 border-amber-300' },
          { label: '40–59%',    cls: 'bg-orange-50 border-orange-300' },
          { label: '<40% — möjlig missuppfattning', cls: 'bg-red-50 border-red-300' },
          { label: 'Ej tränad', cls: 'bg-gray-50 border-gray-200' }
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className={`inline-block h-3 w-3 rounded-sm border ${item.cls}`} />
            {item.label}
          </span>
        ))}
      </div>

      {!hasAnyData ? (
        <p className="text-xs text-gray-400">Ingen träningsdata tillgänglig för de valda eleverna.</p>
      ) : (
        OPERATIONS.map(op => (
          <OperationGrid
            key={op}
            operation={op}
            rows={heatmapData[op]}
            onOpenStudentDetail={onOpenStudentDetail}
          />
        ))
      )}
    </div>
  )
}
