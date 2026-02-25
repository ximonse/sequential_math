export default function TicketDispatchControlPanel({
  selectedTicketDispatchId,
  ticketDispatches,
  ticketDispatchImmediateFeedback,
  selectedClassIds,
  filteredStudentsCount,
  classFilterOptions,
  ticketTargetClassSet,
  ticketStudentSearch,
  ticketFilteredStudentOptions,
  ticketTargetStudentSet,
  ticketResolvedTargetStudentCount,
  ticketHasExplicitTargets,
  ticketTargetClassCount,
  ticketTargetStudentCount,
  copiedTicketDispatchId,
  onSetSelectedTicketDispatchId,
  onSetTicketDispatchImmediateFeedback,
  onTicketTargetsFromClassFilter,
  onClearTicketTargets,
  onToggleTicketTargetClass,
  onSetTicketStudentSearch,
  onToggleTicketTargetStudent,
  onCopyTicketLink,
  onPublishTicketToHome,
  onToggleTicketReveal,
  onClearTicketFromHome,
  onDeleteTicketDispatch
}) {
  return (
    <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 mb-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <label className="text-xs text-gray-600 font-medium">Utskick</label>
        <select
          value={selectedTicketDispatchId}
          onChange={(event) => onSetSelectedTicketDispatchId(event.target.value)}
          className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm min-w-56 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
        >
          <option value="">Välj ticket-utskick</option>
          {ticketDispatches.map(dispatch => (
            <option key={dispatch.id} value={dispatch.id}>
              {dispatch.title} ({dispatch.kind === 'exit' ? 'Exit' : 'Start'})
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={ticketDispatchImmediateFeedback}
            onChange={(event) => onSetTicketDispatchImmediateFeedback(event.target.checked)}
          />
          Nya länkar visar rätt/fel direkt
        </label>
      </div>
      <div className="border border-amber-200 rounded-xl p-3 bg-amber-50/50 mb-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-xs font-bold text-amber-900">Mottagare (för startsidan)</p>
          <button
            onClick={onTicketTargetsFromClassFilter}
            disabled={selectedClassIds.length === 0}
            className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Använd klassfiltret
          </button>
          <button
            onClick={onClearTicketTargets}
            className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
          >
            Nollställ mottagare
          </button>
        </div>
        <p className="text-[11px] text-gray-600 mb-2">
          Inga aktiva val = använder nuvarande urval i dashboarden ({filteredStudentsCount} elev(er)).
        </p>
        <div className="flex flex-wrap gap-1 mb-2">
          {classFilterOptions.map(classItem => {
            const selected = ticketTargetClassSet.has(classItem.id)
            return (
              <button
                key={`ticket-target-class-${classItem.id}`}
                onClick={() => onToggleTicketTargetClass(classItem.id)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${selected
                  ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {selected ? 'Vald: ' : ''}{classItem.name}
              </button>
            )
          })}
        </div>
        <input
          value={ticketStudentSearch}
          onChange={(event) => onSetTicketStudentSearch(event.target.value)}
          placeholder="Sök elev (namn, id, klass)"
          className="w-full px-2.5 py-1.5 border-2 border-amber-100 rounded-lg text-xs focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
        />
        <div className="mt-2 max-h-40 overflow-y-auto border border-amber-100 rounded-lg bg-white divide-y divide-gray-100">
          {ticketFilteredStudentOptions.length === 0 ? (
            <p className="text-xs text-gray-500 p-2">Inga elever matchar sökningen.</p>
          ) : (
            ticketFilteredStudentOptions.slice(0, 140).map(item => {
              const selected = ticketTargetStudentSet.has(item.studentId)
              return (
                <button
                  key={`ticket-target-student-${item.studentId}`}
                  onClick={() => onToggleTicketTargetStudent(item.studentId)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs ${selected
                    ? 'bg-amber-100 text-amber-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-500"> ({item.className || 'Ingen klass'})</span>
                </button>
              )
            })
          )}
        </div>
        {ticketFilteredStudentOptions.length > 140 ? (
          <p className="text-[11px] text-gray-500 mt-1">
            Visar de första 140 matcherna. Förfina sökningen för att se fler.
          </p>
        ) : null}
        <p className="text-[11px] text-gray-700 mt-2 font-medium">
          Målsättning: {ticketResolvedTargetStudentCount} elev(er)
          {ticketHasExplicitTargets
            ? ` via ${ticketTargetClassCount} klass(er) + ${ticketTargetStudentCount} individval`
            : ' via dashboardens aktuella filter'}
        </p>
      </div>

      {ticketDispatches.length === 0 ? (
        <p className="text-sm text-gray-500">Inga ticket-utskick ännu.</p>
      ) : (
        <div className="space-y-2">
          {ticketDispatches.slice(0, 12).map(dispatch => (
            <div key={dispatch.id} className="border border-amber-100 rounded-xl p-3 bg-white flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <p className="font-semibold text-gray-800">{dispatch.title}</p>
                <p className="text-xs text-gray-500">
                  {dispatch.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket'}
                  {' | '}
                  direktfeedback: {dispatch.showCorrectnessOnSubmit ? 'Ja' : 'Nej'}
                </p>
                <p className="text-[11px] text-gray-400 font-mono">{dispatch.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onCopyTicketLink(dispatch.id)}
                  className="px-2.5 py-1.5 bg-gray-800 hover:bg-black text-white rounded-lg text-xs font-semibold"
                >
                  {copiedTicketDispatchId === dispatch.id ? 'Kopierad' : 'Kopiera länk'}
                </button>
                <button
                  onClick={() => onPublishTicketToHome(dispatch.id)}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-xs font-semibold"
                >
                  Visa på startsida
                </button>
                <button
                  onClick={() => onToggleTicketReveal(dispatch.id, !dispatch.revealCorrectness)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${dispatch.revealCorrectness
                    ? 'bg-green-100 hover:bg-green-200 text-green-700'
                    : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                    }`}
                >
                  {dispatch.revealCorrectness ? 'Facit visas' : 'Visa facit för alla'}
                </button>
                <button
                  onClick={() => onClearTicketFromHome(dispatch.id)}
                  className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                >
                  Ta bort från startsida
                </button>
                <button
                  onClick={() => onDeleteTicketDispatch(dispatch.id)}
                  className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-semibold"
                >
                  Ta bort
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
