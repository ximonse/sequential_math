export default function SupportPriorityPanel({
  supportRows,
  supportHeaderHelp,
  getSupportSortIndicator,
  onSupportSort,
  InlineHelpComponent,
  ActivityBadgeComponent,
  RiskBadgeComponent,
  toPercent,
  onOpenStudentDetail,
  onCreateQuickAssignment
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Behöver stöd nu</h2>
        <span className="text-xs text-gray-500">Kompakt prioritering</span>
      </div>
      {supportRows.length === 0 ? (
        <p className="text-sm text-gray-500">Inga akuta signaler i aktuellt urval.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSupportSort('name')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Elev
                    <span className="text-[10px] text-gray-400">{getSupportSortIndicator('name')}</span>
                  </button>
                </th>
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSupportSort('class')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Klass
                    <span className="text-[10px] text-gray-400">{getSupportSortIndicator('class')}</span>
                  </button>
                </th>
                <th className="py-1 pr-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSupportSort('activity')}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      Status
                      <span className="text-[10px] text-gray-400">{getSupportSortIndicator('activity')}</span>
                    </button>
                    <InlineHelpComponent text={supportHeaderHelp.status} />
                  </div>
                </th>
                <th className="py-1 pr-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSupportSort('risk')}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      Risk
                      <span className="text-[10px] text-gray-400">{getSupportSortIndicator('risk')}</span>
                    </button>
                    <InlineHelpComponent text={supportHeaderHelp.risk} />
                  </div>
                </th>
                <th className="py-1 pr-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSupportSort('support_score')}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      Stöd
                      <span className="text-[10px] text-gray-400">{getSupportSortIndicator('support_score')}</span>
                    </button>
                    <InlineHelpComponent text={supportHeaderHelp.support_score} />
                  </div>
                </th>
                <th className="py-1 pr-2">
                  <button
                    type="button"
                    onClick={() => onSupportSort('today_attempts')}
                    className="inline-flex items-center gap-1 hover:text-gray-700"
                  >
                    Idag
                    <span className="text-[10px] text-gray-400">{getSupportSortIndicator('today_attempts')}</span>
                  </button>
                </th>
                <th className="py-1 pr-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSupportSort('today_wrong')}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      R/F idag
                      <span className="text-[10px] text-gray-400">{getSupportSortIndicator('today_wrong')}</span>
                    </button>
                    <InlineHelpComponent text={supportHeaderHelp.today_wrong} />
                  </div>
                </th>
                <th className="py-1 pr-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSupportSort('week_success')}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      Träff v
                      <span className="text-[10px] text-gray-400">{getSupportSortIndicator('week_success')}</span>
                    </button>
                    <InlineHelpComponent text={supportHeaderHelp.week_success} />
                  </div>
                </th>
                <th className="py-1 pr-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSupportSort('struggle')}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      Kämpar med
                      <span className="text-[10px] text-gray-400">{getSupportSortIndicator('struggle')}</span>
                    </button>
                    <InlineHelpComponent text={supportHeaderHelp.struggle} />
                  </div>
                </th>
                <th className="py-1 pr-2">
                  <div className="inline-flex items-center gap-1">
                    <span>Flaggor</span>
                    <InlineHelpComponent text={supportHeaderHelp.flags} />
                  </div>
                </th>
                <th className="py-1">Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {supportRows.map(row => (
                <tr key={`support-${row.studentId}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2 text-gray-700">
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenStudentDetail(row.studentId)}
                        className="text-left hover:underline text-indigo-700 font-medium"
                      >
                        {row.name}
                      </button>
                    </div>
                    <div className="text-[11px] text-gray-400">{row.studentId}</div>
                  </td>
                  <td className="py-1 pr-2 text-gray-700">{row.classNameLabel || row.className || '-'}</td>
                  <td className="py-1 pr-2"><ActivityBadgeComponent code={row.activityStatus} /></td>
                  <td className="py-1 pr-2"><RiskBadgeComponent level={row.riskLevel} score={row.riskScore} /></td>
                  <td className="py-1 pr-2 text-gray-700">{row.supportScore}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.todayAttempts}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.todayCorrectCount}/{row.todayWrongCount}</td>
                  <td className="py-1 pr-2 text-gray-700">{toPercent(row.weekSuccessRate)}</td>
                  <td className="py-1 pr-2 text-gray-700">{row.todayStruggle?.skillLabel || '-'}</td>
                  <td className="py-1 pr-2 text-gray-600">{row.riskCodes.slice(0, 2).join(' | ') || '-'}</td>
                  <td className="py-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onOpenStudentDetail(row.studentId)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px]"
                      >
                        Elevvy
                      </button>
                      <button
                        onClick={() => onCreateQuickAssignment(row, 'focus')}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px]"
                      >
                        Fokus
                      </button>
                      <button
                        onClick={() => onCreateQuickAssignment(row, 'warmup')}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px]"
                      >
                        Värm
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
