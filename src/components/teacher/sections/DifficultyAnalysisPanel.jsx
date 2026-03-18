const DETAIL_LEVEL_SORT_OPTIONS = [
  { value: 'operation', label: 'Räknesätt' },
  { value: 'level', label: 'Nivå' },
  { value: 'attempts', label: 'Försök' },
  { value: 'error_share', label: 'Träff elev' },
  { value: 'knowledge_wrong', label: 'Kunskapsfel' },
  { value: 'inattention_wrong', label: 'Ouppmärksamhet' }
]

function getSuccessRateColorClass(rate) {
  if (rate == null || !Number.isFinite(rate)) return 'text-gray-400'
  if (rate >= 0.8) return 'text-green-700'
  if (rate >= 0.6) return 'text-amber-700'
  return 'text-red-700'
}

export default function DifficultyAnalysisPanel({
  detailStudentProfile,
  detailLevelErrorMinAttempts,
  studentOperationStats7d,
  operationKeys,
  classBenchmarks,
  detailLevelErrorRows,
  detailLevelErrorUnderSampleCount,
  renderDetailLevelErrorSortHeader,
  detailLevelErrorHelp,
  detailLevelErrorSortBy,
  detailLevelErrorSortDir,
  onDetailLevelErrorSortByChange,
  onDetailLevelErrorSortDirChange,
  toPercent
}) {
  if (!detailStudentProfile) {
    return <p className="text-sm text-gray-500">Välj en elev i Elevdetalj för att se svårighetsanalys.</p>
  }

  const isTextSort = detailLevelErrorSortBy === 'operation'
  const ascLabel = isTextSort ? 'A-Ö' : 'Minst först'
  const descLabel = isTextSort ? 'Ö-A' : 'Störst först'

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <h3 className="text-sm font-semibold text-gray-800">
          Svårighetsanalys (≥{detailLevelErrorMinAttempts} försök)
        </h3>
        {studentOperationStats7d ? (
          <p className="text-[11px] text-gray-500">
            Inkl. klassjämförelse ({Math.max(...operationKeys.map(op => classBenchmarks[op]?.studentCount || 0))} elever)
          </p>
        ) : null}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
        <label className="inline-flex items-center gap-1 text-gray-600">
          <span>Sortera efter</span>
          <select
            value={detailLevelErrorSortBy}
            onChange={(event) => onDetailLevelErrorSortByChange?.(event.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700"
          >
            {DETAIL_LEVEL_SORT_OPTIONS.map(option => (
              <option key={`detail-level-sort-${option.value}`} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1 text-gray-600">
          <span>Ordning</span>
          <select
            value={detailLevelErrorSortDir}
            onChange={(event) => onDetailLevelErrorSortDirChange?.(event.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-gray-700"
          >
            <option value="asc">{ascLabel}</option>
            <option value="desc">{descLabel}</option>
          </select>
        </label>
      </div>
      {detailLevelErrorRows.length === 0 ? (
        <p className="text-xs text-gray-500">Ingen nivå har ännu tillräckligt underlag.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                {renderDetailLevelErrorSortHeader('Räknesätt', 'operation', { helpText: detailLevelErrorHelp.operation })}
                {renderDetailLevelErrorSortHeader('Nivå', 'level', { helpText: detailLevelErrorHelp.level })}
                {renderDetailLevelErrorSortHeader('Försök', 'attempts', { helpText: detailLevelErrorHelp.attempts })}
                {renderDetailLevelErrorSortHeader('Träff elev', 'error_share', { helpText: 'Andel rätt (1 - felandel).' })}
                <th className="py-1 pr-2" title="Klassens snittträff för hela räknesättet (alla nivåer), ej per nivå.">Träff klass*</th>
                <th className="py-1 pr-2" title="Delta mot klassens snittträff per räknesätt.">Δ*</th>
                {renderDetailLevelErrorSortHeader('Kunskapsfel', 'knowledge_wrong', { helpText: detailLevelErrorHelp.knowledge_wrong })}
                {renderDetailLevelErrorSortHeader('Ouppmärksamhet', 'inattention_wrong', {
                  className: 'py-1',
                  helpText: detailLevelErrorHelp.inattention_wrong
                })}
              </tr>
            </thead>
            <tbody>
              {detailLevelErrorRows.map(levelRow => {
                const studentAcc = levelRow.successRate
                const classOp = classBenchmarks?.[levelRow.operation]
                const classAcc = classOp?.accuracy
                const accDelta = studentAcc != null && classAcc != null ? studentAcc - classAcc : null
                const accBetter = accDelta != null && accDelta >= 0
                return (
                  <tr key={`detail-level-error-${levelRow.operation}-${levelRow.level}`} className="border-b last:border-b-0">
                    <td className="py-1 pr-2 text-gray-700">{levelRow.operationLabel}</td>
                    <td className="py-1 pr-2 text-gray-700 font-medium">{levelRow.level}</td>
                    <td className="py-1 pr-2 text-gray-700">{levelRow.attempts}</td>
                    <td className={`py-1 pr-2 font-semibold ${getSuccessRateColorClass(studentAcc)}`}>
                      {toPercent(studentAcc)}
                    </td>
                    <td className="py-1 pr-2 text-gray-500">
                      {classAcc != null ? toPercent(classAcc) : '-'}
                    </td>
                    <td className={`py-1 pr-2 font-semibold ${accDelta != null ? (accBetter ? 'text-emerald-700' : 'text-red-600') : 'text-gray-400'}`}>
                      {accDelta != null ? `${accDelta >= 0 ? '+' : ''}${Math.round(accDelta * 100)}%` : '-'}
                    </td>
                    <td className="py-1 pr-2 text-gray-700">{levelRow.knowledgeWrong}</td>
                    <td className="py-1 text-gray-700">{levelRow.inattentionWrong}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {detailLevelErrorUnderSampleCount > 0 ? (
        <p className="mt-2 text-[11px] text-gray-500">
          {detailLevelErrorUnderSampleCount} nivåer har för få försök och visas inte ännu.
        </p>
      ) : null}
    </div>
  )
}
