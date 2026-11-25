import ModuleInfoHint from './ModuleInfoHint'

// Each way of creating an assignment gets its own rounded box with a light
// background, so the panel reads as separate modules instead of one stream of
// rows (Simon 2026-11-24). Controls stay compact; only the box has breathing
// room.
export default function AssignmentModuleBox({ title, hint, children, actions }) {
  return (
    <section
      className="mb-2.5 rounded-[9px] border border-slate-200 bg-slate-50/80 px-2.5 py-2"
      aria-label={title}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {hint ? <ModuleInfoHint label={title}>{hint}</ModuleInfoHint> : null}
        {actions ? <span className="ml-auto flex items-center gap-1.5">{actions}</span> : null}
      </div>
      {children}
    </section>
  )
}
