const MIN_ATTEMPTS_FOR_CONCLUSION = 5

export default function StudentDetailTrainingPriorityPanel({ trainingPriorityList, toPercent }) {
  const notPracticed = trainingPriorityList.filter(item => item.reason === 'not_practiced')
  const struggled = trainingPriorityList.filter(
    item => item.reason !== 'not_practiced' && item.reason !== 'low_data'
  )

  if (trainingPriorityList.length === 0) {
    return (
      <div className="rounded border border-gray-200 bg-gray-50/30 p-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Vad behöver tränas?</h3>
        <p className="text-xs text-gray-500">Ingen träningsprioritet ännu — eleven behöver träna mer!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">
      <div className="rounded border border-gray-200 bg-gray-50/30 p-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Har inte tränat</h3>
        <p className="text-[10px] text-gray-500 mb-2">Nivåer eleven inte övat på ännu.</p>
        {notPracticed.length === 0 ? (
          <p className="text-xs text-gray-500">Inga luckor — eleven har testat alla relevanta nivåer!</p>
        ) : (
          <PriorityTable rows={notPracticed} toPercent={toPercent} neutral />
        )}
      </div>
      <div className="rounded border border-amber-200 bg-amber-50/30 p-3">
        <h3 className="text-sm font-semibold text-amber-900 mb-1">Har tränat — behöver stärkas</h3>
        <p className="text-[10px] text-amber-700 mb-2">
          Nivåer med låg träff (minst {MIN_ATTEMPTS_FOR_CONCLUSION} försök krävs).
        </p>
        {struggled.length === 0 ? (
          <p className="text-xs text-amber-800">Inga svårigheter identifierade!</p>
        ) : (
          <PriorityTable rows={struggled} toPercent={toPercent} />
        )}
      </div>
    </div>
  )
}

function PriorityTable({ rows, toPercent, neutral = false }) {
  const headerCls = neutral
    ? 'text-gray-500 border-gray-200'
    : 'text-amber-800 border-amber-200'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className={`text-left border-b ${headerCls}`}>
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
            <PriorityRow
              key={`priority-${item.operation}-${item.level}-${index}`}
              item={item}
              toPercent={toPercent}
              neutral={neutral}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PriorityRow({ item, toPercent, neutral }) {
  const label = item.priority === 'high' ? 'Hög' : item.priority === 'medium' ? 'Medel' : 'Låg'

  let accentCls, badgeCls, textCls, rowBorderCls
  if (neutral) {
    accentCls = item.priority === 'high'
      ? 'border-l-4 border-l-blue-400'
      : item.priority === 'medium'
        ? 'border-l-4 border-l-gray-400'
        : 'border-l-4 border-l-gray-300'
    badgeCls = item.priority === 'high'
      ? 'bg-blue-400 text-white'
      : item.priority === 'medium'
        ? 'bg-gray-400 text-white'
        : 'bg-gray-200 text-gray-700'
    textCls = 'text-gray-700'
    rowBorderCls = 'border-gray-100'
  } else {
    accentCls = item.priority === 'high'
      ? 'border-l-4 border-l-red-500'
      : item.priority === 'medium'
        ? 'border-l-4 border-l-orange-400'
        : 'border-l-4 border-l-yellow-400'
    badgeCls = item.priority === 'high'
      ? 'bg-red-500 text-white'
      : item.priority === 'medium'
        ? 'bg-orange-400 text-white'
        : 'bg-yellow-400 text-yellow-900'
    textCls = 'text-amber-900'
    rowBorderCls = 'border-amber-100'
  }

  return (
    <tr className={`border-b ${rowBorderCls} last:border-b-0 ${accentCls}`}>
      <td className={`py-1 pr-2 font-medium pl-2 ${textCls}`}>
        {item.operationLabel} nivå {item.level}
      </td>
      <td className={`py-1 pr-2 ${textCls}`}>{item.reasonLabel}</td>
      <td className={`py-1 pr-2 ${textCls}`}>{item.attempts}</td>
      <td className={`py-1 pr-2 ${textCls}`}>
        {item.accuracy != null ? toPercent(item.accuracy) : '-'}
      </td>
      <td className={`py-1 pr-2 ${textCls}`}>
        {Number.isFinite(item.medianSpeed) ? `${item.medianSpeed.toFixed(1)}s` : '-'}
      </td>
      <td className="py-1">
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${badgeCls}`}>
          {label}
        </span>
      </td>
    </tr>
  )
}
