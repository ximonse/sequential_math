const DAY_MS = 24 * 60 * 60 * 1000
const DETAIL_LEVEL_SORT_OPTIONS = [
  { value: 'operation', label: 'Räknesätt' },
  { value: 'level', label: 'Nivå' },
  { value: 'attempts', label: 'Försök' },
  { value: 'error_share', label: 'Träff elev' },
  { value: 'knowledge_wrong', label: 'Kunskapsfel' },
  { value: 'inattention_wrong', label: 'Ouppmärksamhet' }
]

function getTableRecencyColorClass(lastTrainedAt) {
  if (!lastTrainedAt) return 'bg-black text-white'
  const daysSince = (Date.now() - lastTrainedAt) / DAY_MS
  if (daysSince < 1) return 'bg-green-700 text-white'
  if (daysSince < 3) return 'bg-green-300 text-green-900'
  if (daysSince < 5) return 'bg-yellow-300 text-yellow-900'
  if (daysSince < 7) return 'bg-red-400 text-white'
  return 'bg-gray-600 text-white'
}

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
  detailLevelErrorSortBy,
  detailLevelErrorSortDir,
  onDetailLevelErrorSortByChange,
  onDetailLevelErrorSortDirChange,
  getErrorShareColorClass,
  toPercent
}) {
  const isTextSort = detailLevelErrorSortBy === 'operation'
  const ascLabel = isTextSort ? 'A-Ö' : 'Minst först'
  const descLabel = isTextSort ? 'Ö-A' : 'Störst först'

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

      <div className="rounded border border-gray-200 p-3">
        {renderCollapseHeader('tables-recency', <h3 className="text-sm font-semibold text-gray-800">Gångertabeller — antal rätt & senast tränad</h3>)}
        {isCollapsed('tables-recency') ? null : (
          <div className="mt-2">
            <div className="flex gap-1.5">
              {tables.map(table => {
                const rec = detailStudentViewData.tableRecencyByTable[table]
                const colorClass = getTableRecencyColorClass(rec.lastTrainedAt)
                const countLabel = rec.attemptsTotal > 0 ? `${rec.correctTotal}/${rec.attemptsTotal}` : '-'
                const daysSince = rec.lastTrainedAt ? Math.floor((Date.now() - rec.lastTrainedAt) / DAY_MS) : null
                const tooltip = rec.attemptsTotal > 0
                  ? `${table}:ans tabell — ${rec.correctTotal} rätt av ${rec.attemptsTotal} totalt, senast för ${daysSince} dag(ar) sedan`
                  : `${table}:ans tabell — aldrig tränad`
                return (
                  <div
                    key={`detail-table-recency-${table}`}
                    title={tooltip}
                    className={`flex-1 h-14 rounded flex flex-col items-center justify-center cursor-default ${colorClass}`}
                  >
                    <span className="text-[11px] font-bold">{table}</span>
                    <span className="text-[9px] mt-0.5">{countLabel}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5">
              Mörkgrön = idag | Ljusgrön = 1–2 dagar | Gul = 3–4 dagar | Röd = 5–6 dagar | Grå = 7+ dagar | Svart = aldrig tränat
            </p>
          </div>
        )}
      </div>

      <TableDrillDailyChart
        dailyActivity={detailStudentViewData.tableDrillDailyActivity}
        renderCollapseHeader={renderCollapseHeader}
        isCollapsed={isCollapsed}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded border border-gray-200 p-3">
          {renderCollapseHeader('mastery', <h3 className="text-sm font-semibold text-gray-800">Framsteg - mastery</h3>)}
          {isCollapsed('mastery') ? null : (
            <>
              <p className="text-[10px] text-gray-500 mb-2 mt-2">
                Mörkgrön = klarad (vecka) | Ljusgrön = klarad (30d) | Grön kant = klarad (äldre) | Orange = kämpigt | Röd = kämpar | Blå = startad | Grå = ej startad
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
                          const month = item.monthly?.[index]
                          const colorClass = getCompactMasteryColorClass(hist, week, month)
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

const CHART_HEIGHT = 120

function TableDrillDailyChart({ dailyActivity, renderCollapseHeader, isCollapsed }) {
  if (!Array.isArray(dailyActivity) || dailyActivity.length === 0) return null

  const maxCount = Math.max(1, ...dailyActivity.map(d => d.count))
  const totalCount = dailyActivity.reduce((sum, d) => sum + d.count, 0)
  const todayBucket = dailyActivity[dailyActivity.length - 1]

  return (
    <div className="rounded border border-gray-200 p-3">
      {renderCollapseHeader(
        'table-daily-chart',
        <h3 className="text-sm font-semibold text-gray-800">Gångertabeller — aktivitet 3 veckor</h3>,
        {
          rightContent: (
            <p className="text-[11px] text-gray-500">
              Idag: {todayBucket?.count || 0} | Totalt 21d: {totalCount}
            </p>
          )
        }
      )}
      {isCollapsed('table-daily-chart') ? null : (
        <div className="mt-2">
          <div className="flex items-end gap-px" style={{ height: CHART_HEIGHT + 18 }}>
            {dailyActivity.map((day, index) => {
              const barHeight = day.count > 0
                ? Math.max(4, Math.round((day.count / maxCount) * CHART_HEIGHT))
                : 0
              const accuracy = day.count > 0
                ? Math.round((day.correctCount / day.count) * 100)
                : 0
              const barColor = day.isToday
                ? 'bg-indigo-500'
                : day.isWeekend
                  ? 'bg-gray-300'
                  : day.count === 0
                    ? 'bg-gray-200'
                    : 'bg-emerald-400'
              const tooltip = day.count > 0
                ? `${day.dateLabel} (${day.dayLabel}) — ${day.count} tal, ${day.correctCount} rätt (${accuracy}%)`
                : `${day.dateLabel} (${day.dayLabel}) — ingen träning`
              const isMonday = day.dayLabel === 'mån'

              return (
                <div
                  key={`daily-bar-${day.date}`}
                  className={`flex-1 flex flex-col items-center justify-end${isMonday && index > 0 ? ' ml-1' : ''}`}
                  style={{ height: CHART_HEIGHT + 18 }}
                >
                  {day.count > 0 ? (
                    <span className="text-[8px] text-gray-500 mb-0.5 leading-none">{day.count}</span>
                  ) : null}
                  <div
                    title={tooltip}
                    className={`w-full rounded-t cursor-default ${barColor}`}
                    style={{ height: barHeight || 2 }}
                  />
                  <span className={`text-[7px] mt-0.5 leading-none ${day.isToday ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>
                    {day.dayLabel.charAt(0)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-400">{dailyActivity[0]?.dateLabel}</span>
            <span className="text-[9px] text-gray-400">{dailyActivity[Math.floor(dailyActivity.length / 2)]?.dateLabel}</span>
            <span className="text-[9px] font-medium text-indigo-600">idag</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Lila = idag | Grön = vardag | Grå = helg/ingen träning | Siffra = antal tal
          </p>
        </div>
      )}
    </div>
  )
}
