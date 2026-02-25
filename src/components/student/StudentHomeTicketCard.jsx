export default function StudentHomeTicketCard({
  activeTicketPayload,
  activeTicketResponse,
  onOpenTicket
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-100 border border-amber-300/90 rounded-2xl p-4 md:p-5 mb-6 shadow-[0_14px_36px_-24px_rgba(146,64,14,0.6)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-amber-800 font-semibold">
            Aktiv ticket
          </p>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mt-1">
            {activeTicketPayload.title || (activeTicketPayload.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket')}
          </h2>
          <p className="text-sm text-gray-700 mt-1.5 line-clamp-2">
            {activeTicketPayload.question}
          </p>
          {activeTicketResponse && (
            <p className="text-xs text-emerald-700 mt-1.5 font-semibold">
              Svar registrerat {activeTicketResponse.answeredAt ? `(${new Date(activeTicketResponse.answeredAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })})` : ''}
            </p>
          )}
        </div>
        <button
          onClick={onOpenTicket}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl shadow-sm whitespace-nowrap"
        >
          Öppna ticket
        </button>
      </div>
    </div>
  )
}
