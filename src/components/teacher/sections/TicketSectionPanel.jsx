import TicketDispatchControlPanel from './TicketDispatchControlPanel'
import TicketResponsesHistoryPanel from './TicketResponsesHistoryPanel'
import TicketTemplateManagerPanel from './TicketTemplateManagerPanel'

export default function TicketSectionPanel({
  ticketSectionOpen,
  onToggleTicketSectionOpen,
  templatePanelProps,
  dispatchPanelProps,
  responsesPanelProps
}) {
  return (
    <div
      className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/90 rounded-2xl shadow-[0_16px_42px_-26px_rgba(146,64,14,0.55)] p-4 md:p-5 mb-8"
      style={{ order: -50 }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />
      <button
        onClick={onToggleTicketSectionOpen}
        className="w-full flex items-center justify-between text-left mb-4 pt-1"
      >
        <div>
          <h2 className="text-xl font-extrabold text-amber-900">Ticket</h2>
          <span className="text-xs text-amber-800 font-medium">Start-ticket / Exit-ticket</span>
        </div>
        <span className="px-3 py-1.5 rounded-full border border-amber-300 bg-white text-xs font-semibold text-amber-900 shadow-sm">
          {ticketSectionOpen ? 'Dölj' : 'Visa'}
        </span>
      </button>

      {!ticketSectionOpen ? (
        <p className="text-xs text-amber-800 bg-amber-100/70 border border-amber-200 rounded-lg px-3 py-2 inline-block">
          Ticket-sektionen är minimerad.
        </p>
      ) : (
        <>
          <TicketTemplateManagerPanel {...templatePanelProps} />
          <TicketDispatchControlPanel {...dispatchPanelProps} />
          <TicketResponsesHistoryPanel {...responsesPanelProps} />
        </>
      )}
    </div>
  )
}
