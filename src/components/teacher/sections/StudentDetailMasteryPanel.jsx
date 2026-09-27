export default function StudentDetailMasteryPanel({
  renderCollapseHeader,
  isCollapsed,
  detailStudentViewData,
  getCompactMasteryColorClass,
  levels,
  getOperationLabel
}) {
  return (
    <div className="space-y-4">
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
