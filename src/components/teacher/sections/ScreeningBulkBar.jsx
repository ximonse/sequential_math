// Shown while rows are ticked. A soft grey bar (Simon 2026-11-07: the dark one in
// the sketch felt too hard) that stays visible while scrolling the list.
export default function ScreeningBulkBar({ count, actions, onClear, busy }) {
  if (!count) return null
  return <div role="toolbar" aria-label="Åtgärder för markerade" data-screening-bulk
    className="sticky top-0 z-10 my-1 flex flex-wrap items-center gap-2 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-sm text-slate-800 shadow-sm">
    <span className="font-semibold">{count} markerade</span>
    {actions.map(action => <button key={action.label} type="button" disabled={busy} title={action.title} onClick={action.onClick}
      className={`rounded border bg-white px-2 py-0.5 disabled:opacity-50 ${action.danger ? 'border-red-400 text-red-700 hover:bg-red-50' : 'border-slate-400 hover:bg-slate-50'}`}>
      {action.label}</button>)}
    <button type="button" disabled={busy} onClick={onClear} className="rounded border border-slate-400 bg-white px-2 py-0.5 hover:bg-slate-50 disabled:opacity-50">Avmarkera</button>
    {busy && <span role="status">Arbetar…</span>}
  </div>
}
