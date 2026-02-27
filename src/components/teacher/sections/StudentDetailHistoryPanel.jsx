export default function StudentDetailHistoryPanel({
  renderCollapseHeader,
  isCollapsed,
  dailyActivityBreakdown,
  getOperationLabel,
  toPercent,
  detailStudentViewData,
  detailLevelErrorMinAttempts
}) {
  const allLevelRows = Array.isArray(detailStudentViewData?.levelErrorRows)
    ? detailStudentViewData.levelErrorRows.filter(row => row.attempts >= detailLevelErrorMinAttempts)
    : []
  const weakest = [...allLevelRows]
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 3)
  const weakestKeys = new Set(weakest.map(r => `${r.operationLabel}-${r.level}`))
  const strongest = [...allLevelRows]
    .sort((a, b) => (b.successRate * b.level) - (a.successRate * a.level))
    .slice(0, 3)
    .filter(r => !weakestKeys.has(`${r.operationLabel}-${r.level}`))

  const hasTrainedThisWeek = dailyActivityBreakdown.some(day => day.attempts > 0)
  const totalAttemptsThisWeek = dailyActivityBreakdown.reduce((sum, day) => sum + day.attempts, 0)

  return (
    <>
      <div className="mt-3 flex items-center gap-2">
        {hasTrainedThisWeek ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-300 px-3 py-1 text-xs font-semibold text-green-800">
            <span>✓</span> Har tränat — {totalAttemptsThisWeek} uppgifter senaste 7 dagarna
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 border border-red-300 px-3 py-1 text-xs font-semibold text-red-800">
            <span>✗</span> Har inte tränat senaste 7 dagarna
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded border border-red-200 bg-red-50 p-3">
          <h4 className="text-xs font-semibold text-red-900 mb-2">Svagast nivåer</h4>
          {weakest.length === 0 ? (
            <p className="text-xs text-red-700">Inte tillräckligt underlag ännu.</p>
          ) : (
            <div className="space-y-1">
              {weakest.map((row, index) => (
                <div key={`weak-${index}`} className="text-xs text-red-800 bg-red-100 rounded px-2 py-1 flex justify-between">
                  <span>{row.operationLabel} nivå {row.level}</span>
                  <span className="font-semibold">{toPercent(row.successRate)} ({row.attempts} försök)</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded border border-green-200 bg-green-50 p-3">
          <h4 className="text-xs font-semibold text-green-900 mb-2">Starkast nivåer</h4>
          {strongest.length === 0 ? (
            <p className="text-xs text-green-700">Inte tillräckligt underlag ännu.</p>
          ) : (
            <div className="space-y-1">
              {strongest.map((row, index) => (
                <div key={`strong-${index}`} className="text-xs text-green-800 bg-green-100 rounded px-2 py-1 flex justify-between">
                  <span>{row.operationLabel} nivå {row.level}</span>
                  <span className="font-semibold">{toPercent(row.successRate)} ({row.attempts} försök)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded border border-blue-200 bg-blue-50/30 p-3">
        {renderCollapseHeader('history', <h3 className="text-sm font-semibold text-blue-900">Träningshistorik senaste 7 dagarna</h3>)}
        {isCollapsed('history') ? null : (
          <div className="mt-2">
            {!hasTrainedThisWeek ? (
              <p className="text-xs text-blue-800">Ingen aktivitet senaste 7 dagarna.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-blue-700 border-b border-blue-200">
                      <th className="py-1 pr-2">Dag</th>
                      <th className="py-1 pr-2">Försök</th>
                      <th className="py-1 pr-2">Träff</th>
                      <th className="py-1 pr-2">Snittid</th>
                      <th className="py-1">Räknesätt tränade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyActivityBreakdown.map(day => (
                      <tr key={day.date} className={`border-b border-blue-100 last:border-b-0 ${day.attempts === 0 ? 'bg-gray-50' : ''}`}>
                        <td className="py-1 pr-2 text-blue-900 font-medium">{day.date}</td>
                        <td className="py-1 pr-2 text-blue-900">{day.attempts}</td>
                        <td className="py-1 pr-2 text-blue-900">{day.accuracy != null ? toPercent(day.accuracy) : '-'}</td>
                        <td className="py-1 pr-2 text-blue-900">
                          {Number.isFinite(day.medianSpeed) ? `${day.medianSpeed.toFixed(1)}s` : '-'}
                        </td>
                        <td className="py-1 text-blue-900">
                          {day.operations.map(op => getOperationLabel(op)).join(', ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
