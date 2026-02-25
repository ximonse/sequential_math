export default function TicketTemplateManagerPanel({
  ticketQuestionInput,
  ticketAnswerInput,
  ticketTagsInput,
  ticketKindInput,
  ticketCsvInput,
  ticketTemplateFilter,
  ticketTagFilter,
  ticketSortBy,
  ticketTagOptions,
  ticketTemplateRows,
  onSetTicketQuestionInput,
  onSetTicketAnswerInput,
  onSetTicketTagsInput,
  onSetTicketKindInput,
  onCreateTicketTemplate,
  onSetTicketCsvInput,
  onImportTicketCsv,
  onSetTicketTemplateFilter,
  onSetTicketTagFilter,
  onSetTicketSortBy,
  onCreateTicketDispatch,
  onDeleteTicketTemplate
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
      <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 shadow-sm">
        <h3 className="text-base font-bold text-gray-800 mb-2">Ny ticket-fråga</h3>
        <textarea
          value={ticketQuestionInput}
          onChange={(event) => onSetTicketQuestionInput(event.target.value)}
          placeholder="Fråga"
          className="w-full min-h-20 px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm mb-2 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
        />
        <input
          value={ticketAnswerInput}
          onChange={(event) => onSetTicketAnswerInput(event.target.value)}
          placeholder="Facit / rätt svar"
          className="w-full px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm mb-2 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={ticketTagsInput}
            onChange={(event) => onSetTicketTagsInput(event.target.value)}
            placeholder="Taggar, kommaseparerat"
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          />
          <select
            value={ticketKindInput}
            onChange={(event) => onSetTicketKindInput(event.target.value)}
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          >
            <option value="start">Start-ticket</option>
            <option value="exit">Exit-ticket</option>
          </select>
          <button
            onClick={onCreateTicketTemplate}
            className="px-3 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm"
          >
            Spara ticket
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          CSV-import: `Fråga;Svar` per rad (valfritt tredje fält: `Taggar`).
        </p>
        <textarea
          value={ticketCsvInput}
          onChange={(event) => onSetTicketCsvInput(event.target.value)}
          placeholder={'Fråga 1;Svar 1\nFråga 2;Svar 2'}
          className="w-full min-h-24 px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm mt-2 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
        />
        <button
          onClick={onImportTicketCsv}
          className="mt-2 px-3 py-2.5 bg-gray-800 hover:bg-black text-white rounded-xl text-sm font-medium"
        >
          Importera CSV
        </button>
      </div>

      <div className="bg-white/95 rounded-2xl border border-amber-200/90 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <input
            value={ticketTemplateFilter}
            onChange={(event) => onSetTicketTemplateFilter(event.target.value)}
            placeholder="Sök fråga/tagg"
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm flex-1 min-w-40 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          />
          <select
            value={ticketTagFilter}
            onChange={(event) => onSetTicketTagFilter(event.target.value)}
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          >
            <option value="">Alla taggar</option>
            {ticketTagOptions.map(tag => (
              <option key={`ticket-tag-${tag}`} value={tag}>{tag}</option>
            ))}
          </select>
          <select
            value={ticketSortBy}
            onChange={(event) => onSetTicketSortBy(event.target.value)}
            className="px-3 py-2.5 border-2 border-amber-100 rounded-xl text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
          >
            <option value="newest">Senaste</option>
            <option value="oldest">Äldsta</option>
            <option value="alpha">A-Ö</option>
          </select>
        </div>

        {ticketTemplateRows.length === 0 ? (
          <p className="text-sm text-gray-500">Inga ticket-frågor matchar urvalet.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {ticketTemplateRows.map(template => (
              <div key={template.id} className="border border-amber-100 rounded-xl p-3 bg-amber-50/35">
                <p className="text-sm font-semibold text-gray-800 leading-snug">{template.question}</p>
                <p className="text-xs text-gray-600 mt-1">Facit: {template.answer}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {template.kind === 'exit' ? 'Exit-ticket' : 'Start-ticket'}
                  {Array.isArray(template.tags) && template.tags.length > 0 ? ` | ${template.tags.join(', ')}` : ''}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => onCreateTicketDispatch(template)}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-xs font-semibold"
                  >
                    Skapa länk
                  </button>
                  <button
                    onClick={() => onDeleteTicketTemplate(template.id)}
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
    </div>
  )
}
