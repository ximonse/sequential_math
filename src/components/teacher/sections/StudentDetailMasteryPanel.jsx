import { getCompactMasteryConcern, getCompactMasteryStatus } from './dashboardTableStatusUtils'

const STATUS_LABELS = {
  mastered_week: 'Belagd sedan veckostart',
  mastered_month: 'Belagd de senaste 30 dagarna',
  mastered_older: 'Historiskt belagd',
  difficult: 'Svårt i senaste underlaget',
  struggling: 'Många fel i senaste underlaget',
  started: 'Prövad, ännu inte belagd',
  empty: 'Inga svar som räknas för mastery'
}

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
      <div>
        <div className="rounded border border-gray-200 p-3">
          {renderCollapseHeader('mastery', <h3 className="text-base font-semibold text-gray-800">Framsteg – mastery</h3>)}
          {isCollapsed('mastery') ? null : (
            <>
              <p className="mb-3 mt-2 text-sm leading-relaxed text-gray-600">
                Mörkgrön = belagd sedan veckostart · Ljusgrön = belagd senaste 30 dagarna · Grön kant = historiskt belagd · Orange = svårt i senaste underlaget · Röd = många fel i senaste underlaget · Blå = prövad, ännu inte belagd · Grå = inga svar som räknas för mastery
              </p>
              <p className="mb-3 text-sm text-gray-600">En orange eller röd prick på en grön ruta visar nya svårigheter utan att ta bort tidigare belagd nivå. Varje ruta bedöms för sig; sammanhängande nivå visas i klassens nivåöversikt.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="min-w-40 py-1 pr-2 text-left text-xs font-normal text-gray-500"><span className="sr-only">Kunskapsområde</span></th>
                      {levels.map(level => (
                        <th key={`mastery-header-${level}`} className="w-9 py-1 text-center text-xs font-medium text-gray-600">{level}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detailStudentViewData.operationMasteryBoards.map(item => (
                      <tr key={`compact-mastery-${item.operation}`}>
                        <th scope="row" className="py-1 pr-2 text-left text-sm font-medium text-gray-700">{getOperationLabel(item.operation)}</th>
                        {levels.map((level, index) => {
                          const hist = item.historical[index]
                          const week = item.weekly[index]
                          const month = item.monthly?.[index]
                          const colorClass = getCompactMasteryColorClass(hist, week, month)
                          const status = getCompactMasteryStatus(hist, week, month)
                          const concern = getCompactMasteryConcern(hist)
                          const hasAttainment = status.startsWith('mastered_')
                          const evidence = hist?.attempts
                            ? `${hist.correct} av ${hist.attempts} masterygrundande svar rätt totalt; senaste bedömningsfönstret ${hist.masteryCorrect} av ${hist.masteryAttempts} rätt.`
                            : status === 'mastered_older'
                              ? 'Giltigt äldre mastery-belägg finns, men ursprungliga svar saknas i aktuell problemlogg.'
                              : 'Inga masterygrundande svar i sparad historik.'
                          const concernText = hasAttainment && concern
                            ? ` Senaste underlaget visar ${concern === 'many_errors' ? 'många fel' : 'svårigheter'}, trots tidigare belagd nivå.`
                            : ''
                          const tooltip = `${getOperationLabel(item.operation)} nivå ${level}: ${STATUS_LABELS[status]}. ${evidence}${concernText}`
                          return (
                            <td key={`compact-mastery-${item.operation}-${level}`} className="p-1 text-center">
                              <span
                                title={tooltip}
                                aria-label={tooltip}
                                className={`relative inline-flex h-9 w-9 items-center justify-center rounded text-sm font-bold cursor-default ${colorClass}`}
                              >
                                {level}
                                {hasAttainment && concern && <span aria-hidden="true" className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white ${concern === 'many_errors' ? 'bg-red-500' : 'bg-orange-500'}`} />}
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
