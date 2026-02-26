import { useMemo, useState } from 'react'
import { inferOperationFromProblemType } from '../../../lib/mathUtils'
import { getOperationLabel } from '../../../lib/operations'

const LEVELS = Array.from({ length: 12 }, (_, i) => i + 1)
const OPERATIONS = ['addition', 'subtraction', 'multiplication', 'division', 'algebra_evaluate', 'algebra_simplify', 'arithmetic_expressions', 'fractions']

const OP_SYMBOL = {
  addition: '+', subtraction: '−', multiplication: '×', division: '÷',
  algebra_evaluate: 'ax', algebra_simplify: '→',
  arithmetic_expressions: '( )', fractions: '/'
}

const OPERATION_ACCENT = {
  addition:               'bg-blue-500',
  subtraction:            'bg-violet-500',
  multiplication:         'bg-orange-500',
  division:               'bg-teal-500',
  algebra_evaluate:       'bg-indigo-500',
  algebra_simplify:       'bg-purple-500',
  arithmetic_expressions: 'bg-rose-500',
  fractions:              'bg-lime-600'
}

const CELL_CLASSES = {
  empty:     'bg-gray-50 border-gray-200 text-gray-300 cursor-default',
  mastered:  'bg-emerald-100 border-emerald-400 text-emerald-700 hover:bg-emerald-200 cursor-default',
  progress:  'bg-amber-100 border-amber-400 text-amber-700 hover:bg-amber-200 cursor-default',
  struggling:'bg-orange-100 border-orange-400 text-orange-700 hover:bg-orange-200 cursor-default',
  concern:   'bg-red-100 border-red-400 text-red-700 hover:bg-red-200 cursor-pointer'
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
        entry.levelData[level] = {
          attempts: 0,
          correct: 0,
          knowledgeWrong: 0,
          patternCounts: {},
          wrongAnswers: []
        }
      }
      const cell = entry.levelData[level]
      cell.attempts += 1
      if (problem.correct) cell.correct += 1
      const errCat = String(problem.errorCategory || '')
      if (!problem.correct && (errCat === 'knowledge' || errCat === 'misconception')) {
        cell.knowledgeWrong += 1
        if (errCat === 'misconception') cell.misconceptionCount = (cell.misconceptionCount || 0) + 1
        if (cell.wrongAnswers.length < 20) {
          const a = problem.values?.a
          const b = problem.values?.b
          const question = (a != null && b != null) ? `${a} ${OP_SYMBOL[op] || '?'} ${b}` : null
          cell.wrongAnswers.push({
            studentAnswer: problem.studentAnswer,
            correctAnswer: problem.correctAnswer,
            errorCategory: errCat,
            errorDetail: String(problem.errorDetail || ''),
            patterns: Array.isArray(problem.patterns) ? problem.patterns.slice(0, 2) : [],
            question,
            timestamp: problem.timestamp || 0
          })
        }
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
          if (!d || d.attempts === 0) return { level, attempts: 0, successRate: null, knowledgeWrong: 0, misconceptionCount: 0, topPatterns: [], wrongAnswers: [] }
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
            topPatterns,
            wrongAnswers: d.wrongAnswers || []
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
  const exampleWrong = cell.wrongAnswers.find(w => w.question)
  const misconceptionType = cell.wrongAnswers.find(w => w.errorCategory === 'misconception' && w.patterns.length > 0)?.patterns[0]
    || cell.wrongAnswers.find(w => w.errorCategory === 'misconception' && w.errorDetail)?.errorDetail
  return (
    <div className="pointer-events-none absolute z-20 bottom-full left-1/2 mb-1.5 -translate-x-1/2 w-max max-w-64 rounded border border-gray-200 bg-white shadow-lg px-2.5 py-1.5 text-left">
      <p className="text-[11px] font-semibold text-gray-800 leading-snug">{studentName} &middot; Nivå {cell.level}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">
        {pct}% rätt &middot; {cell.attempts} försök
        {cell.knowledgeWrong > 0 && ` · ${cell.knowledgeWrong} kunskapsfel`}
      </p>
      {cell.misconceptionCount > 0 && (
        <p className="text-[10px] text-red-600 font-semibold mt-0.5">⚠ {cell.misconceptionCount} missuppfattning{cell.misconceptionCount > 1 ? 'ar' : ''}</p>
      )}
      {misconceptionType && (
        <p className="text-[10px] text-orange-700 mt-0.5 font-mono">Typ: {misconceptionType}</p>
      )}
      {exampleWrong && (
        <p className="text-[10px] text-gray-600 mt-0.5">
          Ex: <span className="font-mono font-semibold">{exampleWrong.question}</span>
          {' '}→ svarade <span className="text-red-600 font-semibold">{exampleWrong.studentAnswer}</span>
          {' '}(rätt: <span className="text-green-700 font-semibold">{exampleWrong.correctAnswer}</span>)
        </p>
      )}
      {cell.topPatterns.length > 0 && (
        <p className="text-[10px] text-orange-600 mt-0.5 font-mono">{cell.topPatterns.join(', ')}</p>
      )}
      {getCellVariant(cell.successRate, cell.attempts) === 'concern' && (
        <p className="text-[9px] text-gray-400 mt-1 italic">Klicka för fler detaljer</p>
      )}
    </div>
  )
}

function CellDetailModal({ cell, studentName, onClose }) {
  const pct = Math.round(cell.successRate * 100)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{studentName} — Nivå {cell.level}</p>
            <p className="text-xs text-gray-500 mt-0.5">{pct}% rätt &middot; {cell.attempts} försök &middot; {cell.correct} rätt / {cell.attempts - cell.correct} fel</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-3">✕</button>
        </div>

        {cell.misconceptionCount > 0 && (
          <div className="mb-3 rounded bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs font-semibold text-red-700">⚠ {cell.misconceptionCount} missuppfattning{cell.misconceptionCount > 1 ? 'ar' : ''}</p>
          </div>
        )}

        {cell.topPatterns.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-gray-600 mb-1">Felmönster</p>
            <div className="flex flex-wrap gap-1">
              {cell.topPatterns.map(p => (
                <span key={p} className="inline-block bg-orange-50 border border-orange-200 text-orange-700 rounded px-2 py-0.5 text-[10px] font-mono">{p}</span>
              ))}
            </div>
          </div>
        )}

        {cell.wrongAnswers.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-gray-600 mb-1">
              Fel ({cell.wrongAnswers.length}) — senaste överst
            </p>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {[...cell.wrongAnswers].sort((a, b) => b.timestamp - a.timestamp).map((ex, i) => {
                const errorTypeLabel = ex.patterns.length > 0
                  ? ex.patterns.join(', ')
                  : ex.errorDetail || (ex.errorCategory === 'misconception' ? 'Missuppfattning' : 'Kunskapsfel')
                const isMisconception = ex.errorCategory === 'misconception'
                return (
                  <div key={i} className="text-xs bg-gray-50 rounded px-2 py-1.5 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ex.question && (
                        <span className="font-mono font-semibold text-gray-700">{ex.question} =</span>
                      )}
                      <span className="text-red-600 font-semibold">{ex.studentAnswer ?? '?'}</span>
                      <span className="text-gray-400 text-[10px]">rätt:</span>
                      <span className="text-green-700 font-semibold">{ex.correctAnswer ?? '?'}</span>
                      <span className={`ml-auto text-[9px] rounded px-1 shrink-0 ${isMisconception ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'}`}>
                        {isMisconception ? 'missuppfattning' : 'kunskapsfel'}
                      </span>
                    </div>
                    <div className="text-[10px] text-orange-700 font-mono">{errorTypeLabel}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {cell.wrongAnswers.length === 0 && cell.knowledgeWrong === 0 && (
          <p className="text-xs text-gray-400">Inga detaljerade feldata tillgängliga.</p>
        )}
      </div>
    </div>
  )
}

function OperationGrid({ operation, rows, onOpenStudentDetail }) {
  const [hoveredKey, setHoveredKey] = useState(null)
  const [activeCell, setActiveCell] = useState(null)

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
                  const isClickable = cell.attempts > 0 && variant === 'concern'
                  return (
                    <td key={cell.level} className="px-0.5 py-0.5 align-middle">
                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                      >
                        <div
                          className={`h-7 w-7 flex items-center justify-center rounded border text-[9px] font-semibold leading-none transition-colors ${CELL_CLASSES[variant]} ${cell.attempts > 0 && cell.attempts < 3 ? 'opacity-40' : ''}`}
                          onClick={isClickable ? () => setActiveCell({ cell, studentName: row.name }) : undefined}
                        >
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

      {activeCell && (
        <CellDetailModal
          cell={activeCell.cell}
          studentName={activeCell.studentName}
          onClose={() => setActiveCell(null)}
        />
      )}
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
        <span className="text-[11px] text-gray-400">Hover för detaljer &middot; klicka röd cell för felanalys &middot; klicka elevnamn för att öppna eleven</span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {[
          { label: '≥85% rätt', cls: 'bg-emerald-100 border-emerald-400' },
          { label: '60–84%',    cls: 'bg-amber-100 border-amber-400' },
          { label: '40–59%',    cls: 'bg-orange-100 border-orange-400' },
          { label: '<40% — klickbar', cls: 'bg-red-100 border-red-400' },
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
        <div className="grid grid-cols-2 gap-6">
          {OPERATIONS.map(op => (
            <OperationGrid
              key={op}
              operation={op}
              rows={heatmapData[op]}
              onOpenStudentDetail={onOpenStudentDetail}
            />
          ))}
        </div>
      )}
    </div>
  )
}
