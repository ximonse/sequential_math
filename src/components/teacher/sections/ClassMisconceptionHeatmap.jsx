import { useEffect, useMemo, useRef, useState } from 'react'
import { getOperationLabel } from '../../../lib/operations'
import { getTeacherApiToken } from '../../../lib/teacherAuth'
import {
  buildHeatmapData,
  LEVELS,
  OPERATIONS
} from './classMisconceptionHeatmapData'

const OPERATION_ACCENT = {
  addition: 'bg-blue-500',
  subtraction: 'bg-violet-500',
  multiplication: 'bg-orange-500',
  division: 'bg-teal-500',
  algebra_evaluate: 'bg-indigo-500',
  algebra_simplify: 'bg-purple-500',
  arithmetic_expressions: 'bg-rose-500',
  fractions: 'bg-lime-600',
  percentage: 'bg-amber-500'
}

const CELL_CLASSES = {
  empty: 'bg-gray-50 border-gray-200 text-gray-300',
  mastered: 'bg-emerald-100 border-emerald-400 text-emerald-700 hover:bg-emerald-200',
  progress: 'bg-amber-100 border-amber-400 text-amber-700 hover:bg-amber-200',
  struggling: 'bg-orange-100 border-orange-400 text-orange-700 hover:bg-orange-200',
  concern: 'bg-red-100 border-red-400 text-red-700 hover:bg-red-200'
}

const HEATMAP_CLOUD_CACHE_TTL_MS = 5 * 60 * 1000
const HEATMAP_CLOUD_FETCH_CONCURRENCY = 6

function getCellVariant(successRate, attempts) {
  if (!attempts || successRate === null) return 'empty'
  if (successRate >= 0.85) return 'mastered'
  if (successRate >= 0.6) return 'progress'
  if (successRate >= 0.4) return 'struggling'
  return 'concern'
}

function normalizeStudentId(value) {
  return String(value || '').trim().toUpperCase()
}

async function fetchCloudProfileForHeatmap(studentId, teacherToken) {
  const id = normalizeStudentId(studentId)
  if (!id) return null
  if (!teacherToken) return null

  const response = await fetch(`/api/student/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: {
      'x-teacher-token': teacherToken
    }
  })
  if (!response.ok) return null
  const data = await response.json()
  const profile = data?.profile
  return profile && typeof profile === 'object' ? profile : null
}

async function hydrateHeatmapCloudProfiles(students, teacherToken, cacheRef) {
  const now = Date.now()
  const hydratedById = {}
  const toFetch = []

  for (const student of students) {
    const studentId = normalizeStudentId(student?.studentId)
    if (!studentId) continue
    const cached = cacheRef.current.get(studentId)
    if (cached && (now - Number(cached.fetchedAt || 0)) < HEATMAP_CLOUD_CACHE_TTL_MS) {
      hydratedById[studentId] = cached.profile
      continue
    }
    toFetch.push(studentId)
  }

  if (toFetch.length === 0 || !teacherToken) {
    return {
      hydratedById,
      fetchedCount: 0,
      failedCount: teacherToken ? 0 : toFetch.length
    }
  }

  let cursor = 0
  let failedCount = 0

  const worker = async () => {
    while (cursor < toFetch.length) {
      const index = cursor
      cursor += 1
      const studentId = toFetch[index]
      try {
        const cloudProfile = await fetchCloudProfileForHeatmap(studentId, teacherToken)
        if (!cloudProfile) {
          failedCount += 1
          continue
        }
        cacheRef.current.set(studentId, {
          profile: cloudProfile,
          fetchedAt: Date.now()
        })
        hydratedById[studentId] = cloudProfile
      } catch {
        failedCount += 1
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(HEATMAP_CLOUD_FETCH_CONCURRENCY, toFetch.length) },
    () => worker()
  )
  await Promise.all(workers)

  return {
    hydratedById,
    fetchedCount: toFetch.length - failedCount,
    failedCount
  }
}

function FeatureSignalList({ title, signals }) {
  if (!Array.isArray(signals) || signals.length === 0) return null
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold text-gray-600 mb-1">{title}</p>
      <div className="space-y-1">
        {signals.map(item => (
          <div key={item.tag} className="text-[11px] bg-blue-50 border border-blue-100 rounded px-2 py-1">
            <span className="font-medium text-blue-900">{item.label}</span>
            <span className="text-blue-700"> - {item.knowledgeWrong}/{item.attempts} kunskapsfel</span>
            <span className="text-blue-500"> ({Math.round(item.errorRate * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CellTooltip({ cell, studentName }) {
  const pct = Math.round(cell.successRate * 100)
  const exampleWrong = [...cell.wrongAnswers]
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))[0]
  const misconceptionType = cell.topPatterns[0] || null
  return (
    <div className="pointer-events-none absolute z-20 bottom-full left-1/2 mb-1.5 -translate-x-1/2 w-max max-w-72 rounded border border-gray-200 bg-white shadow-lg px-2.5 py-1.5 text-left">
      <p className="text-[11px] font-semibold text-gray-800 leading-snug">{studentName} · Niva {cell.level}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">
        {pct}% ratt · {cell.attempts} forsok · {cell.knowledgeWrong} kunskapsfel
      </p>
      {cell.newLevelSignals.length > 0 && (
        <p className="text-[10px] text-blue-700 mt-0.5">
          Nytt pa nivan: {cell.newLevelSignals.map(item => item.label).join(', ')}
        </p>
      )}
      {cell.misconceptionCount > 0 && (
        <p className="text-[10px] text-red-600 font-semibold mt-0.5">⚠ {cell.misconceptionCount} missuppfattning(ar)</p>
      )}
      {misconceptionType && (
        <p className="text-[10px] text-orange-700 mt-0.5 font-mono">Typ: {misconceptionType}</p>
      )}
      {exampleWrong && (
        <p className="text-[10px] text-gray-600 mt-0.5">
          Ex: <span className="font-mono font-semibold">{exampleWrong.question}</span>
          {' '}→ svar <span className="text-red-600 font-semibold">{exampleWrong.studentAnswer}</span>
          {' '}(ratt: <span className="text-green-700 font-semibold">{exampleWrong.correctAnswer}</span>)
        </p>
      )}
      {cell.knowledgeWrong > 0 && (
        <p className="text-[9px] text-gray-400 mt-1 italic">Klicka for senaste 10 av {cell.knowledgeWrong} kunskapsfel</p>
      )}
    </div>
  )
}

function CellDetailModal({ cell, studentName, onClose }) {
  const pct = Math.round(cell.successRate * 100)
  const sortedWrongAnswers = [...cell.wrongAnswers]
    .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
  const visibleWrongAnswers = sortedWrongAnswers.slice(0, 10)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 max-w-3xl w-full mx-4"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{studentName} - Niva {cell.level}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {pct}% ratt · {cell.attempts} forsok · {cell.correct} ratt / {cell.attempts - cell.correct} fel
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-3">✕</button>
        </div>

        <FeatureSignalList
          title="Nytt pa nivan jamfort med lagre nivaer"
          signals={cell.newLevelSignals}
        />
        {cell.newLevelSignals.length === 0 && (
          <p className="text-[11px] text-gray-500 mb-3">
            Inget tydligt nytt moment hittades pa denna niva jamfort med lagre nivaer.
          </p>
        )}

        <FeatureSignalList
          title="Svarast pa denna niva just nu"
          signals={cell.challengeSignals.slice(0, 6)}
        />

        {cell.misconceptionCount > 0 && (
          <div className="mb-3 rounded bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs font-semibold text-red-700">⚠ {cell.misconceptionCount} missuppfattning(ar)</p>
          </div>
        )}

        {cell.topPatterns.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-gray-600 mb-1">Felmönster</p>
            <div className="flex flex-wrap gap-1">
              {cell.topPatterns.map(pattern => (
                <span key={pattern} className="inline-block bg-orange-50 border border-orange-200 text-orange-700 rounded px-2 py-0.5 text-[10px] font-mono">{pattern}</span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold text-gray-600 mb-1">
            Senaste {visibleWrongAnswers.length} av {cell.knowledgeWrong} kunskapsfel pa niva {cell.level}
          </p>
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {visibleWrongAnswers.map((example, index) => {
              const errorTypeLabel = example.patterns.length > 0
                ? example.patterns.join(', ')
                : example.errorDetail || (example.errorCategory === 'misconception' ? 'Missuppfattning' : 'Kunskapsfel')
              const isMisconception = example.errorCategory === 'misconception'
              return (
                <div key={`${example.timestamp || 0}-${index}`} className="text-xs bg-gray-50 rounded px-2 py-1.5 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {example.question && (
                      <span className="font-mono font-semibold text-gray-700">{example.question} =</span>
                    )}
                    <span className="text-red-600 font-semibold">{example.studentAnswer ?? '?'}</span>
                    <span className="text-gray-400 text-[10px]">ratt:</span>
                    <span className="text-green-700 font-semibold">{example.correctAnswer ?? '?'}</span>
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

        {visibleWrongAnswers.length === 0 && (
          <p className="text-xs text-gray-400">Inga kunskapsfel hittades pa denna niva.</p>
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
          <span className="text-xs text-gray-300">- ingen data</span>
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
                  const isClickable = cell.knowledgeWrong > 0
                  return (
                    <td key={cell.level} className="px-0.5 py-0.5 align-middle">
                      <div
                        className="relative"
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                      >
                        <div
                          className={`h-7 w-7 flex items-center justify-center rounded border text-[9px] font-semibold leading-none transition-colors ${CELL_CLASSES[variant]} ${cell.attempts > 0 && cell.attempts < 3 ? 'opacity-40' : ''} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
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
  const normalizedStudents = useMemo(() => (
    (Array.isArray(filteredStudents) ? filteredStudents : [])
      .filter(student => normalizeStudentId(student?.studentId))
  ), [filteredStudents])
  const studentIdsKey = useMemo(
    () => normalizedStudents
      .map(student => normalizeStudentId(student.studentId))
      .sort()
      .join('|'),
    [normalizedStudents]
  )

  const cloudCacheRef = useRef(new Map())
  const [cloudProfilesById, setCloudProfilesById] = useState({})
  const [cloudStatus, setCloudStatus] = useState({
    loading: false,
    failedCount: 0,
    fetchedCount: 0,
    total: 0,
    lastSyncAt: 0
  })

  useEffect(() => {
    const activeIds = new Set(normalizedStudents.map(student => normalizeStudentId(student.studentId)))
    if (activeIds.size === 0) {
      setCloudProfilesById({})
      setCloudStatus({
        loading: false,
        failedCount: 0,
        fetchedCount: 0,
        total: 0,
        lastSyncAt: 0
      })
      return
    }

    const now = Date.now()
    const cachedProfiles = {}
    for (const student of normalizedStudents) {
      const studentId = normalizeStudentId(student.studentId)
      const cached = cloudCacheRef.current.get(studentId)
      if (cached && (now - Number(cached.fetchedAt || 0)) < HEATMAP_CLOUD_CACHE_TTL_MS) {
        cachedProfiles[studentId] = cached.profile
      }
    }

    setCloudProfilesById(prev => {
      const next = {}
      for (const student of normalizedStudents) {
        const studentId = normalizeStudentId(student.studentId)
        next[studentId] = cachedProfiles[studentId] || prev[studentId]
      }
      return next
    })

    const teacherToken = getTeacherApiToken()
    let isActive = true

    setCloudStatus(prev => ({
      ...prev,
      loading: true,
      total: activeIds.size
    }))

    void (async () => {
      const result = await hydrateHeatmapCloudProfiles(normalizedStudents, teacherToken, cloudCacheRef)
      if (!isActive) return

      setCloudProfilesById(prev => {
        const next = {}
        for (const student of normalizedStudents) {
          const studentId = normalizeStudentId(student.studentId)
          next[studentId] = result.hydratedById[studentId] || cachedProfiles[studentId] || prev[studentId]
        }
        return next
      })

      setCloudStatus({
        loading: false,
        failedCount: result.failedCount,
        fetchedCount: result.fetchedCount,
        total: activeIds.size,
        lastSyncAt: Date.now()
      })
    })()

    return () => {
      isActive = false
    }
  }, [normalizedStudents, studentIdsKey])

  const heatmapStudents = useMemo(
    () => normalizedStudents.map(student => {
      const studentId = normalizeStudentId(student.studentId)
      return cloudProfilesById[studentId] || student
    }),
    [normalizedStudents, cloudProfilesById]
  )

  const heatmapData = useMemo(
    () => buildHeatmapData(heatmapStudents),
    [heatmapStudents]
  )
  const hasAnyData = OPERATIONS.some(op => heatmapData[op].length > 0)

  const cloudStatusLine = cloudStatus.loading
    ? 'Synkar full historik fran cloud for missuppfattningar...'
    : cloudStatus.total === 0
      ? 'Ingen elev vald.'
      : cloudStatus.failedCount > 0
        ? `Cloud-data saknas for ${cloudStatus.failedCount} elev(er). Lokal fallback visas for dem.`
        : `Full historik synkad (${cloudStatus.total} elever)${cloudStatus.lastSyncAt ? `, ${new Date(cloudStatus.lastSyncAt).toLocaleTimeString('sv-SE')}` : ''}.`

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
        <h2 className="text-sm font-semibold text-gray-800">Missuppfattningar - klassoversikt</h2>
        <span className="text-[11px] text-gray-400">Hover for detaljer · klicka cell med kunskapsfel for komplett fellista pa nivan</span>
      </div>

      <p className={`text-[11px] mb-3 ${cloudStatus.failedCount > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
        {cloudStatusLine}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {[
          { label: '>=85% ratt', cls: 'bg-emerald-100 border-emerald-400' },
          { label: '60-84%', cls: 'bg-amber-100 border-amber-400' },
          { label: '40-59%', cls: 'bg-orange-100 border-orange-400' },
          { label: '<40%', cls: 'bg-red-100 border-red-400' },
          { label: 'Ej tranad', cls: 'bg-gray-50 border-gray-200' }
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className={`inline-block h-3 w-3 rounded-sm border ${item.cls}`} />
            {item.label}
          </span>
        ))}
      </div>

      {!hasAnyData ? (
        <p className="text-xs text-gray-400">Ingen traningsdata tillganglig for de valda eleverna.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {OPERATIONS.map(operation => (
            <OperationGrid
              key={operation}
              operation={operation}
              rows={heatmapData[operation]}
              onOpenStudentDetail={onOpenStudentDetail}
            />
          ))}
        </div>
      )}
    </div>
  )
}
