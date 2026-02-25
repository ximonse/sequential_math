export default function TicketResponsesHistoryPanel({
  ticketSelectedDispatch,
  ticketResponseMeta,
  ticketResponseRows,
  onOpenStudentDetail,
  formatTimeAgo,
  ticketHistoryStudentId,
  ticketHistoryStudentOptions,
  ticketHistoryKindFilter,
  ticketHistoryResultFilter,
  ticketHistorySearch,
  ticketHistoryStudent,
  ticketHistorySummary,
  ticketHistoryRows,
  onSetTicketHistoryStudentId,
  onSetTicketHistoryKindFilter,
  onSetTicketHistoryResultFilter,
  onSetTicketHistorySearch
}) {
  return (
    <>
      <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-gray-800">Svar för valt utskick</h3>
          {ticketSelectedDispatch ? (
            <p className="text-xs text-gray-700 font-medium">
              Svarat {ticketResponseMeta.answered}/{ticketResponseMeta.total}
              {' | '}
              Rätt {ticketResponseMeta.correct}
              {' | '}
              Fel {ticketResponseMeta.wrong}
            </p>
          ) : null}
        </div>
        {!ticketSelectedDispatch ? (
          <p className="text-sm text-gray-500">Välj ett utskick ovan för att se elevsvar.</p>
        ) : ticketResponseRows.length === 0 ? (
          <p className="text-sm text-gray-500">Inga mottagare eller svar ännu för detta utskick.</p>
        ) : (
          <div className="overflow-x-auto border border-amber-100 rounded-xl">
            <table className="w-full text-sm bg-white">
              <thead>
                <tr className="text-left text-gray-600 border-b bg-amber-50">
                  <th className="py-2 px-2 pr-2">Elev</th>
                  <th className="py-2 pr-2">Klass</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Svar</th>
                  <th className="py-2 px-2">Tid</th>
                </tr>
              </thead>
              <tbody>
                {ticketResponseRows.map(row => (
                  <tr key={`ticket-response-${row.studentId}`} className="border-b last:border-b-0 hover:bg-amber-50/35">
                    <td className="py-2 px-2 pr-2 text-gray-700 font-semibold">
                      <button
                        type="button"
                        onClick={() => onOpenStudentDetail(row.studentId)}
                        className="text-left hover:underline text-indigo-700"
                      >
                        {row.name}
                      </button>
                    </td>
                    <td className="py-2 pr-2 text-gray-600">{row.className || '-'}</td>
                    <td className="py-2 pr-2">
                      {!row.answered ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-gray-50 text-gray-500 border-gray-200 font-medium">
                          Ej svarat
                        </span>
                      ) : row.isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-green-50 text-green-700 border-green-200 font-semibold">
                          Rätt
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-red-50 text-red-700 border-red-200 font-semibold">
                          Fel
                        </span>
                      )}
                    </td>
                    <td className={`py-2 pr-2 ${row.answered && !row.isCorrect ? 'text-red-700' : 'text-gray-700'}`}>
                      {row.answered ? (row.studentAnswer || '-') : '-'}
                    </td>
                    <td className="py-2 px-2 text-gray-600">{formatTimeAgo(row.answeredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 mt-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-base font-bold text-gray-800">Elevhistorik i tickets</h3>
          {ticketHistoryStudent ? (
            <p className="text-xs text-gray-700 font-medium">
              Senaste svar: {formatTimeAgo(ticketHistorySummary.latestAnsweredAt)}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-2 mb-3">
          <select
            value={ticketHistoryStudentId}
            onChange={(event) => onSetTicketHistoryStudentId(event.target.value)}
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          >
            {ticketHistoryStudentOptions.length === 0 ? (
              <option value="">Inga elever i urvalet</option>
            ) : (
              ticketHistoryStudentOptions.map(item => (
                <option key={`ticket-history-student-${item.studentId}`} value={item.studentId}>
                  {item.name} {item.className ? `(${item.className})` : ''}
                </option>
              ))
            )}
          </select>
          <select
            value={ticketHistoryKindFilter}
            onChange={(event) => onSetTicketHistoryKindFilter(event.target.value)}
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          >
            <option value="all">Alla typer</option>
            <option value="start">Start-ticket</option>
            <option value="exit">Exit-ticket</option>
          </select>
          <select
            value={ticketHistoryResultFilter}
            onChange={(event) => onSetTicketHistoryResultFilter(event.target.value)}
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          >
            <option value="all">Alla resultat</option>
            <option value="correct">Bara rätt</option>
            <option value="wrong">Bara fel</option>
          </select>
          <input
            value={ticketHistorySearch}
            onChange={(event) => onSetTicketHistorySearch(event.target.value)}
            placeholder="Sök i fråga/svar"
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          />
        </div>

        {!ticketHistoryStudent ? (
          <p className="text-sm text-gray-500">Välj klassfilter ovan eller lägg till elever för att se historik.</p>
        ) : ticketHistorySummary.total === 0 ? (
          <p className="text-sm text-gray-500">Den här eleven har inte svarat på någon ticket ännu.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 mb-3 text-xs">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                <p className="text-gray-500">Totalt svar</p>
                <p className="font-semibold text-gray-800">{ticketHistorySummary.total}</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 px-2.5 py-1.5">
                <p className="text-green-700">Rätt</p>
                <p className="font-semibold text-green-700">{ticketHistorySummary.correct}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5">
                <p className="text-red-700">Fel</p>
                <p className="font-semibold text-red-700">{ticketHistorySummary.wrong}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5">
                <p className="text-blue-700">Träffsäkerhet</p>
                <p className="font-semibold text-blue-700">{Math.round(ticketHistorySummary.accuracy * 100)}%</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                <p className="text-amber-700">Senaste 7 dagar</p>
                <p className="font-semibold text-amber-700">{ticketHistorySummary.last7Days}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5">
                <p className="text-indigo-700">Unika utskick</p>
                <p className="font-semibold text-indigo-700">{ticketHistorySummary.uniqueDispatches}</p>
              </div>
            </div>

            {ticketHistoryRows.length === 0 ? (
              <p className="text-sm text-gray-500">Inga historikrader matchar filtret.</p>
            ) : (
              <div className="overflow-x-auto border border-amber-100 rounded-xl">
                <table className="w-full text-sm bg-white">
                  <thead>
                    <tr className="text-left text-gray-600 border-b bg-amber-50">
                      <th className="py-2 px-2 pr-2">Tid</th>
                      <th className="py-2 pr-2">Ticket</th>
                      <th className="py-2 pr-2">Status</th>
                      <th className="py-2 pr-2">Svar</th>
                      <th className="py-2 px-2">Facit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketHistoryRows.map((row, index) => (
                      <tr key={`ticket-history-row-${row.dispatchId}-${row.answeredAt || index}`} className="border-b last:border-b-0 hover:bg-amber-50/35">
                        <td className="py-2 px-2 pr-2 text-gray-600 whitespace-nowrap">{formatTimeAgo(row.answeredAt)}</td>
                        <td className="py-2 pr-2 text-gray-700">
                          <p className="font-semibold">{row.title}</p>
                          <p className="text-[11px] text-gray-500">
                            {row.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket'}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{row.question}</p>
                        </td>
                        <td className="py-2 pr-2">
                          {row.isCorrect ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-green-50 text-green-700 border-green-200 font-semibold">
                              Rätt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs bg-red-50 text-red-700 border-red-200 font-semibold">
                              Fel
                            </span>
                          )}
                        </td>
                        <td className={`py-2 pr-2 ${row.isCorrect ? 'text-gray-700' : 'text-red-700'}`}>
                          {row.studentAnswer || '-'}
                        </td>
                        <td className="py-2 px-2 text-gray-700">{row.expectedAnswer || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
