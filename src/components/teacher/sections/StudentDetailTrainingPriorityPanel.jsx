export default function StudentDetailTrainingPriorityPanel({
  trainingPriorityList,
  toPercent
}) {
  const notPracticed = trainingPriorityList.filter(item => item.reason === 'not_practiced')
  const struggled = trainingPriorityList.filter(item => item.reason !== 'not_practiced')

  if (trainingPriorityList.length === 0) {
    return (
      <div className="rounded border border-red-200 bg-red-50/30 p-3 mb-4">
        <h3 className="text-sm font-semibold text-red-900 mb-2">Vad behöver tränas?</h3>
        <p className="text-xs text-red-800">Ingen träningsprioritet ännu - eleven behöver träna mer!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">
      <div className="rounded border border-gray-300 bg-gray-50/30 p-3">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Har inte tränat</h3>
        <p className="text-[10px] text-gray-500 mb-2">Nivåer eleven inte övat på ännu.</p>
        {notPracticed.length === 0 ? (
          <p className="text-xs text-gray-500">Inga luckor - eleven har testat alla relevanta nivåer!</p>
        ) : (
          <PriorityTable rows={notPracticed} toPercent={toPercent} />
        )}
      </div>
      <div className="rounded border border-red-200 bg-red-50/30 p-3">
        <h3 className="text-sm font-semibold text-red-900 mb-1">Har tränat - behöver stärkas</h3>
        <p className="text-[10px] text-red-700 mb-2">Nivåer med för låg träff eller för lite data.</p>
        {struggled.length === 0 ? (
          <p className="text-xs text-red-800">Inga svårigheter identifierade!</p>
        ) : (
          <PriorityTable rows={struggled} toPercent={toPercent} />
        )}
      </div>
    </div>
  )
}

function PriorityTable({ rows, toPercent }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-red-700 border-b border-red-200">
            <th className="py-1 pr-2">Räknesätt + Nivå</th>
            <th className="py-1 pr-2">Anledning</th>
            <th className="py-1 pr-2">Försök</th>
            <th className="py-1 pr-2">Träff</th>
            <th className="py-1 pr-2">Snittid</th>
            <th className="py-1">Prioritet</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <PriorityRow key={`priority-${item.operation}-${item.level}-${index}`} item={item} toPercent={toPercent} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PriorityRow({ item, toPercent }) {
  const borderClass = item.priority === 'high'
    ? 'border-l-4 border-l-red-500'
    : item.priority === 'medium'
      ? 'border-l-4 border-l-orange-400'
      : 'border-l-4 border-l-yellow-400'
  const badgeClass = item.priority === 'high'
    ? 'bg-red-500 text-white'
    : item.priority === 'medium'
      ? 'bg-orange-400 text-white'
      : 'bg-yellow-400 text-yellow-900'
  const label = item.priority === 'high' ? 'Hög' : item.priority === 'medium' ? 'Medel' : 'Låg'

  return (
    <tr className={`border-b border-red-100 last:border-b-0 ${borderClass}`}>
      <td className="py-1 pr-2 text-red-900 font-medium pl-2">
        {item.operationLabel} nivå {item.level}
      </td>
      <td className="py-1 pr-2 text-red-900">{item.reasonLabel}</td>
      <td className="py-1 pr-2 text-red-900">{item.attempts}</td>
      <td className="py-1 pr-2 text-red-900">{item.accuracy != null ? toPercent(item.accuracy) : '-'}</td>
      <td className="py-1 pr-2 text-red-900">
        {Number.isFinite(item.medianSpeed) ? `${item.medianSpeed.toFixed(1)}s` : '-'}
      </td>
      <td className="py-1">
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${badgeClass}`}>
          {label}
        </span>
      </td>
    </tr>
  )
}
