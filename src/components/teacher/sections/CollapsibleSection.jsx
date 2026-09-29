import ChevronIcon from './ChevronIcon'

export default function CollapsibleSection({
  title,
  collapsed,
  onToggle,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  children
}) {
  return (
    <section className="mb-3 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5">
        <button type="button" className="flex min-w-0 flex-1 items-center text-left" onClick={onToggle} aria-expanded={!collapsed}>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</span>
        </button>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {canMoveUp && <button type="button" onClick={onMoveUp} className="px-1 text-sm leading-none text-gray-400 hover:text-gray-700" aria-label="Flytta upp">↑</button>}
          {canMoveDown && <button type="button" onClick={onMoveDown} className="px-1 text-sm leading-none text-gray-400 hover:text-gray-700" aria-label="Flytta ner">↓</button>}
          <button type="button" onClick={onToggle} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900" aria-label={collapsed ? `Visa ${title}` : `Dölj ${title}`}>
            <ChevronIcon expanded={!collapsed} />
          </button>
        </div>
      </div>
      {!collapsed && <div>{children}</div>}
    </section>
  )
}
