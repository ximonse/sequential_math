export default function StudentDetailMasteryPanel({
  renderCollapseHeader,
  isCollapsed,
  detailStudentViewData,
  tables,
  getTableSpeedColorClass,
  classTableBenchmarks,
  getCompactMasteryColorClass,
  levels,
  getOperationLabel,
  detailLevelErrorMinAttempts,
  operationKeys,
  classBenchmarks,
  studentOperationStats7d,
  detailLevelErrorRows,
  detailLevelErrorUnderSampleCount,
  renderDetailLevelErrorSortHeader,
  detailLevelErrorHelp,
  getErrorShareColorClass,
  toPercent
}) {
  return (
    <div className="space-y-4">
      <div className="rounded border border-gray-200 p-3">
        {renderCollapseHeader(
          'tables',
          <h3 className="text-sm font-semibold text-gray-800">Gångertabeller - hastighet 7d</h3>,
          {
            rightContent: (
              <p className="text-[11px] text-gray-500">
                Dag: {detailStudentViewData.tableSticky.todayDoneCount} | Vecka: {detailStudentViewData.tableSticky.weekDoneCount} | Star: {detailStudentViewData.tableSticky.starCount}
              </p>
            )
          }
        )}
        {isCollapsed('tables') ? null : (
          <div className="mt-2">
            <div className="flex gap-1.5">
              {tables.map(table => {
                const perf = detailStudentViewData.tablePerformanceByTable[table]
                const colorClass = getTableSpeedColorClass(perf.medianSpeed7d, perf.accuracy7d, perf.attempts7d)
                const classMedian = classTableBenchmarks[table]
                const speedLabel = Number.isFinite(perf.medianSpeed7d) ? `${perf.medianSpeed7d.toFixed(1)}s` : '-'
                const classSpeedLabel = Number.isFinite(classMedian) ? `${classMedian.toFixed(1)}s` : '-'
                const accLabel = perf.accuracy7d != null ? `${Math.round(perf.accuracy7d * 100)}%` : '-'
                const tooltip = `${table}:ans tabell - ${accLabel} rätt, ${speedLabel} snitt, ${perf.attempts7d} försök (klass: ${classSpeedLabel})`
                return (
                  <div
                    key={`detail-table-speed-${table}`}
                    title={tooltip}
                    className={`flex-1 h-12 rounded flex flex-col items-center justify-center text-xs font-semibold cursor-default ${colorClass}`}
                  >
                    <span className="text-[11px] font-bold">{table}</span>
                    <span className="text-[9px] mt-0.5">{speedLabel}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5">
              Mörkgrön ≤2s | Grön ≤3.5s | Ljusgrön ≤5s | Gul ≤8s | Orange &gt;8s | Röd &lt;50% rätt | Grå = inga försök
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border border-gray-200 p-3">
          {renderCollapseHeader('mastery', <h3 className="text-sm font-semibold text-gray-800">Framsteg - mastery</h3>)}
          {isCollapsed('mastery') ? null : (
            <>
              <p className="text-[10px] text-gray-500 mb-2 mt-2">
                Mörkgrön = mastered | Ljusgrön = aktiv veckan | Orange = kämpigt | Röd = kämpar | Blå = startad | Grå = ej startad
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-1 pr-1 text-gray-500 font-normal text-[10px] w-20"></th>
                      {levels.map(level => (
                        <th key={`mastery-header-${level}`} className="py-1 text-center text-gray-500 font-normal text-[10px] w-8">{level}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailStudentViewData.operationMasteryBoards.map(item => (
                      <tr key={`compact-mastery-${item.operation}`}>
                        <td className="py-0.5 pr-1 text-gray-700 font-medium text-[11px]">{getOperationLabel(item.operation)}</td>
                        {levels.map((level, index) => {
                          const hist = item.historical[index]
                          const week = item.weekly[index]
                          const colorClass = getCompactMasteryColorClass(hist, week)
                          const hLabel = hist && hist.attempts > 0 ? `${hist.correct}/${hist.attempts}` : '-'
                          const wLabel = week && week.attempts > 0 ? `${week.correct}/${week.attempts}` : ''
                          const hRate = hist && hist.attempts > 0 ? Math.round(hist.successRate * 100) : 0
                          const tooltip = `${getOperationLabel(item.operation)} nivå ${level} - ${hLabel} rätt (${hRate}%)${wLabel ? `, vecka: ${wLabel}` : ''}`
                          return (
                            <td key={`compact-mastery-${item.operation}-${level}`} className="p-0.5 text-center">
                              <span
                                title={tooltip}
                                className={`inline-flex h-7 w-7 items-center justify-center rounded text-[9px] font-bold cursor-default ${colorClass}`}
                              >
                                {level}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <h4 className="text-xs font-semibold text-gray-800">
                    Svårighetsanalys (≥{detailLevelErrorMinAttempts} försök)
                  </h4>
                  {studentOperationStats7d ? (
                    <p className="text-[11px] text-gray-500">
                      Inkl. klassjämförelse ({Math.max(...operationKeys.map(op => classBenchmarks[op]?.studentCount || 0))} elever)
                    </p>
                  ) : null}
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
                              <td className={`py-1 pr-2 font-semibold ${getErrorShareColorClass(levelRow.errorShare)}`}>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
