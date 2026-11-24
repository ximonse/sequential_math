// Read-only rows for assignments that are active on a class, group or pupil but
// are missing from this teacher's own assignment library. Without them an
// administrator who opens another teacher's class sees an empty panel even
// though the pupils have work (Simon 2026-11-24).
export default function ForeignAssignmentRows({ items = [], formatAssignmentSummaryLine }) {
  if (!items.length) return null
  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-xs font-medium text-gray-600">
        Aktiva uppdrag som inte finns i ditt uppdragsbibliotek — visas bara,
        kan inte aktiveras eller avaktiveras härifrån
      </p>
      {items.map(item => (
        <div
          key={item.id}
          data-foreign-assignment-row
          className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5"
        >
          <p className="text-sm font-medium text-gray-800">{item.assignment.title}</p>
          {formatAssignmentSummaryLine && (
            <p className="text-sm text-gray-500">{formatAssignmentSummaryLine(item.assignment)}</p>
          )}
          <p className="text-xs text-amber-900">
            {item.targets.length ? `Aktiv i ${item.targets.join(', ')}` : 'Aktiv'}
            {item.activatedByName ? ` · aktiverat av ${item.activatedByName}` : ''}
          </p>
        </div>
      ))}
    </div>
  )
}
