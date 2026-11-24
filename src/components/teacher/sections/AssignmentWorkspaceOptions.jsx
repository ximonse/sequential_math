// In the panel the module box already says "Arbetsytor", so the legend would
// say it twice. In the dialog there is no box, so it stays visible.
export default function AssignmentWorkspaceOptions({ value, onChange, showLegend = true }) {
  return <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-800">
    <legend className={showLegend ? 'font-medium' : 'sr-only'}>Arbetsytor för eleven</legend>
    {[['notebook', 'Räknehäfte'], ['drawing', 'Rityta']].map(([key, label]) =>
      <label key={key} className="flex items-center gap-1">
        <input type="checkbox" checked={value[key]} onChange={event => onChange({ ...value, [key]: event.target.checked })} />
        {label}
      </label>)}
  </fieldset>
}
