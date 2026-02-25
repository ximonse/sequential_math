export default function ResultsOverviewPanel({
  students,
  viewMode,
  onSetViewMode,
  visibleRows,
  sortBy,
  onSetSortBy,
  sortDir,
  onToggleSortDir,
  onExportSnapshotCsv,
  onExportDetailedProblemCsv,
  onExportSkillComparisonCsv,
  onExportTableDevelopmentCsv,
  onExportActivityCsv,
  renderResultSortHeader,
  resultHeaderHelp,
  formatDuration,
  formatTimeAgo,
  getSuccessColorClass,
  getReasonableColorClass,
  toPercent,
  onOpenStudentDetail,
  onCreateQuickAssignment,
  onResetStudentPassword,
  passwordResetBusyId,
  RiskBadgeComponent
}) {
  return (
    <div style={{ order: -10 }}>
      {students.length === 0 ? (
        <div className="bg-white rounded-lg p-8 shadow text-center">
          <p className="text-gray-500 text-lg">Inga elever ännu</p>
          <p className="text-gray-400 mt-2">
            Lägg till elever via klasslistan ovan så kan de logga in.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-gray-500">Resultatvy</span>
              <button
                onClick={() => onSetViewMode('daily')}
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'daily'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Dagsvy
              </button>
              <button
                onClick={() => onSetViewMode('all')}
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Alla elever
              </button>
              <button
                onClick={() => onSetViewMode('weekly')}
                className={`px-3 py-1.5 rounded text-sm ${viewMode === 'weekly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Veckovy
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-gray-500">Sortera</label>
              <select
                value={sortBy}
                onChange={(event) => onSetSortBy(event.target.value)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="name">Namn</option>
                <option value="student_id">ID</option>
                <option value="class">Klass</option>
                <option value="active_today">Aktiv idag</option>
                <option value="today_attempts">Dagens mängd</option>
                <option value="today_wrong">Dagens felsvar</option>
                <option value="today_success_rate">Dagens träffsäkerhet</option>
                <option value="today_struggle">Dagens kämp-index</option>
                <option value="today_engaged">Tid på uppgift idag</option>
                <option value="today_answer_length">Dagens svarslängd</option>
                <option value="active_week">Aktiv denna vecka</option>
                <option value="week_attempts">Veckans mängd</option>
                <option value="week_correct">Veckans rätt</option>
                <option value="week_wrong">Veckans felsvar</option>
                <option value="week_struggle">Veckans kämp-index</option>
                <option value="week_active_time">Veckans aktiv tid</option>
                <option value="week_engaged">Tid på uppgift 7d</option>
                <option value="week_success_rate">Veckans träffsäkerhet</option>
                <option value="week_answer_length">Veckans svarslängd</option>
                <option value="assignment_week">Uppdragsföljsamhet v</option>
                <option value="support_score">Stödscore</option>
                <option value="risk_score">Riskscore</option>
                <option value="logged_in">Har loggat in</option>
                <option value="last_active">Senast aktiv</option>
                <option value="attempts">Totala försök</option>
                <option value="success_rate">Total träffsäkerhet</option>
                <option value="reasonable_rate">Total rimlighet</option>
                <option value="avg_relative_error">Total medelavvikelse</option>
                <option value="trend">Trend</option>
              </select>
              <button
                onClick={onToggleSortDir}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
              >
                {sortDir === 'desc' ? 'Fallande' : 'Stigande'}
              </button>
              <button
                onClick={onExportSnapshotCsv}
                className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-sm"
              >
                Export översikt
              </button>
              <button
                onClick={onExportDetailedProblemCsv}
                className="px-2 py-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded text-sm"
              >
                Export rådata
              </button>
              <button
                onClick={onExportSkillComparisonCsv}
                className="px-2 py-1 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded text-sm"
              >
                Export skill
              </button>
              <button
                onClick={onExportTableDevelopmentCsv}
                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-sm"
              >
                Export tabeller
              </button>
              <button
                onClick={onExportActivityCsv}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm"
              >
                Export aktivitet
              </button>
            </div>
          </div>

          {viewMode === 'daily' && visibleRows.length === 0 ? (
            <div className="mb-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Inga elever i valt urval.
            </div>
          ) : null}
          {viewMode === 'weekly' && visibleRows.length === 0 ? (
            <div className="mb-4 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Inga elever i valt urval.
            </div>
          ) : null}

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-600">
                {renderResultSortHeader('Namn', 'name')}
                {renderResultSortHeader('ID', 'student_id')}
                {renderResultSortHeader('Klass', 'class')}
                {viewMode === 'daily' ? (
                  <>
                    {renderResultSortHeader('Gjort idag', 'today_attempts', { helpText: resultHeaderHelp.today_attempts })}
                    {renderResultSortHeader('Rätt/fel idag', 'today_wrong', { helpText: resultHeaderHelp.today_wrong })}
                    {renderResultSortHeader('Tid på uppgift idag', 'today_engaged', { helpText: resultHeaderHelp.today_engaged })}
                    {renderResultSortHeader('Kämpar med idag', 'today_struggle', { helpText: resultHeaderHelp.today_struggle })}
                    {renderResultSortHeader('Svarslängd idag', 'today_answer_length', { helpText: resultHeaderHelp.today_answer_length })}
                    {renderResultSortHeader('Senast aktiv', 'last_active')}
                    <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                  </>
                ) : viewMode === 'weekly' ? (
                  <>
                    {renderResultSortHeader('Gjort denna vecka', 'week_attempts', { helpText: resultHeaderHelp.week_attempts })}
                    {renderResultSortHeader('Aktiv tid (svar)', 'week_active_time', { helpText: resultHeaderHelp.week_active_time })}
                    {renderResultSortHeader('Tid på uppgift', 'week_engaged', { helpText: resultHeaderHelp.week_engaged })}
                    {renderResultSortHeader('Rätt/fel vecka', 'week_wrong', { helpText: resultHeaderHelp.week_wrong })}
                    {renderResultSortHeader('Kämpar med vecka', 'week_struggle', { helpText: resultHeaderHelp.week_struggle })}
                    {renderResultSortHeader('Svarslängd vecka', 'week_answer_length', { helpText: resultHeaderHelp.week_answer_length })}
                    {renderResultSortHeader('Senast aktiv', 'last_active')}
                    <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                  </>
                ) : (
                  <>
                    {renderResultSortHeader('Försök', 'attempts')}
                    {renderResultSortHeader('Rätt', 'success_rate', { helpText: resultHeaderHelp.success_rate })}
                    {renderResultSortHeader('Rimlighet', 'reasonable_rate', { helpText: resultHeaderHelp.reasonable_rate })}
                    {renderResultSortHeader('Medelavvikelse', 'avg_relative_error', { helpText: resultHeaderHelp.avg_relative_error })}
                    {renderResultSortHeader('Trend', 'trend', { helpText: resultHeaderHelp.trend })}
                    {renderResultSortHeader('Senast aktiv', 'last_active')}
                    <th className="px-4 py-0 font-semibold text-right">Åtgärd</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => (
                <tr key={row.studentId} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className={`px-4 py-0 font-semibold ${row.hasLoggedIn ? 'text-green-700' : 'text-gray-800'}`}>
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenStudentDetail(row.studentId)}
                        className="text-left hover:underline text-indigo-700"
                      >
                        {row.name}
                      </button>
                    </div>
                    <div className="mt-1">
                      <RiskBadgeComponent level={row.riskLevel} score={row.riskScore} />
                    </div>
                  </td>
                  <td className="px-4 py-0 text-xs text-gray-400 font-mono">
                    {row.studentId}
                  </td>
                  <td className="px-4 py-0 text-gray-700">
                    {row.classNameLabel || row.className || '-'}
                  </td>
                  {viewMode === 'daily' ? (
                    <>
                      <td className="px-4 py-0 text-gray-700">
                        {row.todayAttempts}
                        <div className="text-xs text-gray-500 mt-1">{row.todayOperationSummary}</div>
                      </td>
                      <td className="px-4 py-0">
                        <span className={getSuccessColorClass(row.todaySuccessRate)}>
                          {toPercent(row.todaySuccessRate)} ({row.todayCorrectCount}/{row.todayAttempts || 0})
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Rimliga fel: {row.todayWrongCount > 0 ? `${row.todayReasonableWrongCount}/${row.todayWrongCount}` : '-'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Uppdrag: {row.todayAssignmentAdherenceRate === null ? '-' : toPercent(row.todayAssignmentAdherenceRate)}
                        </div>
                      </td>
                      <td className="px-4 py-0 text-gray-700">
                        {formatDuration(row.todayEngagedMinutes * 60)}
                        <div className="text-xs text-gray-500 mt-1">
                          {row.todayPresenceInteractions} interaktioner
                        </div>
                      </td>
                      <td className="px-4 py-0 text-gray-700">
                        {row.todayStruggle
                          ? (
                            <>
                              <div className="font-medium">{row.todayStruggle.skillLabel}</div>
                              <div className="text-xs text-gray-500">
                                {row.todayStruggle.attempts} försök, {row.todayStruggle.wrong} fel
                              </div>
                            </>
                          )
                          : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-0 text-gray-700">
                        {row.todayAvgAnswerLength === null
                          ? '-'
                          : `${row.todayAvgAnswerLength.toFixed(1)} tecken`}
                      </td>
                      <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                    </>
                  ) : viewMode === 'weekly' ? (
                    <>
                      <td className="px-4 py-0 text-gray-700">
                        {row.weekAttempts}
                        <div className="text-xs text-gray-500 mt-1">{row.weekOperationSummary}</div>
                      </td>
                      <td className="px-4 py-0 text-gray-700">
                        {formatDuration(row.weekActiveTimeSec)}
                        <div className="text-xs text-gray-500 mt-1">
                          snitt {row.weekAvgTimePerProblemSec > 0 ? `${Math.round(row.weekAvgTimePerProblemSec)}s/problem` : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-0 text-gray-700">
                        {formatDuration(row.weekEngagedMinutes * 60)}
                        <div className="text-xs text-gray-500 mt-1">
                          {row.weekPresenceInteractions} interaktioner
                        </div>
                      </td>
                      <td className="px-4 py-0">
                        <span className={getSuccessColorClass(row.weekSuccessRate)}>
                          {toPercent(row.weekSuccessRate)} ({row.weekCorrectCount}/{row.weekAttempts || 0})
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Rimliga fel: {row.weekWrongCount > 0 ? `${row.weekReasonableWrongCount}/${row.weekWrongCount}` : '-'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Uppdrag: {row.weekAssignmentAdherenceRate === null ? '-' : toPercent(row.weekAssignmentAdherenceRate)}
                        </div>
                      </td>
                      <td className="px-4 py-0 text-gray-700">
                        {row.weekStruggle
                          ? (
                            <>
                              <div className="font-medium">{row.weekStruggle.skillLabel}</div>
                              <div className="text-xs text-gray-500">
                                {row.weekStruggle.attempts} försök, {row.weekStruggle.wrong} fel
                              </div>
                            </>
                          )
                          : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-0 text-gray-700">
                        {row.weekAvgAnswerLength === null
                          ? '-'
                          : `${row.weekAvgAnswerLength.toFixed(1)} tecken`}
                      </td>
                      <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-0 text-gray-700">{row.attempts}</td>
                      <td className="px-4 py-0">
                        <span className={getSuccessColorClass(row.successRate)}>
                          {toPercent(row.successRate)}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {row.correctCount}/{row.attempts} rätt
                        </div>
                      </td>
                      <td className="px-4 py-0">
                        <span className={getReasonableColorClass(row.reasonableRate)}>
                          {toPercent(row.reasonableRate)}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {row.reasonableCount}/{row.attempts} rimliga
                        </div>
                      </td>
                      <td className="px-4 py-0 text-gray-700">
                        {row.avgRelativeError === null ? '-' : `${Math.round(row.avgRelativeError * 100)}%`}
                      </td>
                      <td className="px-4 py-0">
                        {row.trend === null ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className={row.trend >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {row.trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(row.trend * 100))}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-0 text-gray-600">{formatTimeAgo(row.lastActive)}</td>
                    </>
                  )}
                  <td className="px-4 py-0 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <button
                        onClick={() => onOpenStudentDetail(row.studentId)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                      >
                        Elevvy
                      </button>
                      <button
                        onClick={() => onCreateQuickAssignment(row, 'focus')}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                      >
                        Fokus
                      </button>
                      <button
                        onClick={() => onCreateQuickAssignment(row, 'warmup')}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs"
                      >
                        Värm upp
                      </button>
                      <button
                        onClick={() => onCreateQuickAssignment(row, 'challenge')}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs"
                      >
                        Mix
                      </button>
                      <button
                        onClick={() => onResetStudentPassword(row.studentId)}
                        disabled={passwordResetBusyId === row.studentId}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-200 text-gray-700 rounded text-xs"
                      >
                        {passwordResetBusyId === row.studentId ? 'Nollställer...' : 'Nollställ lösen'}
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
