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
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-100 cursor-pointer select-none"
        onClick={onToggle}
      >
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {canMoveUp && (
            <button onClick={onMoveUp} className="text-gray-400 hover:text-gray-700 px-1 text-sm leading-none">↑</button>
          )}
          {canMoveDown && (
            <button onClick={onMoveDown} className="text-gray-400 hover:text-gray-700 px-1 text-sm leading-none">↓</button>
          )}
          <button onClick={onToggle} className="text-gray-400 hover:text-gray-700 px-1 text-sm leading-none ml-1">
            {collapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  )
}
