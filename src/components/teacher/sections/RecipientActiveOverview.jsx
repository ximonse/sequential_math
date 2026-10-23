import { buildRecipientOverview } from './recipientOverview'

export default function RecipientActiveOverview({ recipients = [], assignmentTargets, assignments, groups, students }) {
  if (recipients.length === 0) return null
  const rows = buildRecipientOverview(recipients, { assignmentTargets, assignments, groups, students })
  return (
    <section data-recipient-overview aria-labelledby="recipient-overview-title" className="bg-white rounded-lg shadow p-3 mb-3">
      <h3 id="recipient-overview-title" className="text-sm font-semibold text-slate-800">Aktivt för valda mottagare</h3>
      <ul className="mt-1.5 space-y-1.5">
        {rows.map(row => (
          <li key={`${row.type}-${row.id}`} data-recipient-overview-row className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">{row.type === 'group' && !row.name.startsWith('Grupp: ') ? `Grupp: ${row.name}` : row.name}</span>
            {' · '}
            {row.assignmentTitles.length ? `Uppdrag: ${row.assignmentTitles.join(', ')}` : 'Inga egna uppdrag'}
            {row.tickets.length > 0 && ` · Ticket: ${row.tickets.map(item => row.type === 'student' ? item.title : `${item.title} (${item.count} av ${row.pupilCount})`).join(', ')}`}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-slate-500">Uppdrag som en elev får via sin klass eller grupp visas på klassen eller gruppen. Screeningar finns under Screening.</p>
    </section>
  )
}
