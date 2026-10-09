export default function AssignmentWorkspaceOptions({ value, onChange }) {
  return <fieldset className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-800">
    <legend className="font-medium">Arbetsytor för eleven</legend>
    {[['notebook', 'Räknehäfte'], ['drawing', 'Rityta']].map(([key, label]) =>
      <label key={key} className="flex items-center gap-1">
        <input type="checkbox" checked={value[key]} onChange={event => onChange({ ...value, [key]: event.target.checked })} />
        {label}
      </label>)}
  </fieldset>
}
