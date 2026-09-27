const pct = value => Number.isFinite(value) ? `${Math.round(value * 100)}%` : '–'
const shortDate = value => `${Number(value.slice(8))}/${Number(value.slice(5, 7))}`

export default function TablePracticeProgressChart({ subject, cohort, name }) {
  const daily = subject.daily || []
  if (daily.length === 0) return null
  const width = 640
  const left = 30
  const plotWidth = width - left - 16
  const step = plotWidth / daily.length
  const x = index => left + step * (index + 0.5)
  const maxCount = Math.max(1, ...daily.map(day => day.attempts))
  const peers = cohort?.daily || []
  const points = (series, color) => series.map((day, index) => {
    if (!Number.isFinite(day.accuracy)) return null
    const previous = series[index - 1]
    const y = 210 - day.accuracy * 70
    return <g key={`${color}-${day.date}`}>
      {previous && !previous.smallSample && !day.smallSample && Number.isFinite(previous.accuracy)
        ? <line x1={x(index - 1)} y1={210 - previous.accuracy * 70} x2={x(index)} y2={y} stroke={color} strokeWidth="2" /> : null}
      <circle cx={x(index)} cy={y} r="4" fill={day.smallSample ? 'white' : color} stroke={day.smallSample ? '#64748b' : color} strokeWidth="2"><title>{shortDate(day.date)}: {day.correct}/{day.attempts} rätt, {pct(day.accuracy)}{day.smallSample ? ', litet underlag' : ''}</title></circle>
    </g>
  })
  return <div className="mt-4">
    <h3 className="text-sm font-semibold">Träning över tid · {name}</h3>
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} 235`} role="img" aria-label={`Antal svar och andel rätt dag för dag för ${name}`} className="w-full min-w-96">
      <text x="0" y="14" fontSize="11" fill="#475569">Antal svar</text>
      <line x1={left} y1="102" x2={width - 16} y2="102" stroke="#cbd5e1" />
      {daily.map((day, index) => <g key={day.date}>
        <rect x={x(index) - step * 0.27} y={102 - day.attempts / maxCount * 62} width={step * 0.54} height={day.attempts / maxCount * 62} fill={day.smallSample ? '#94a3b8' : '#0f766e'} rx="2"><title>{shortDate(day.date)}: {day.attempts} svar</title></rect>
        <text x={x(index)} y={Math.min(96, 96 - day.attempts / maxCount * 62)} textAnchor="middle" fontSize="10" fill="#334155">{day.available ? day.attempts : '–'}</text>
        <text x={x(index)} y="228" textAnchor="middle" fontSize="9" fill="#475569">{shortDate(day.date)}</text>
      </g>)}
      <text x="0" y="127" fontSize="11" fill="#475569">Andel rätt</text>
      {[0, 0.5, 1].map(rate => <g key={rate}><line x1={left} y1={210 - rate * 70} x2={width - 16} y2={210 - rate * 70} stroke="#e2e8f0" /><text x="1" y={213 - rate * 70} fontSize="9" fill="#64748b">{rate * 100}</text></g>)}
      {points(peers, '#b45309')}{points(daily, '#0f766e')}
    </svg></div>
    <p className="text-xs text-slate-600">Grönt: {name}.{cohort ? ' Orange: övriga i urvalet.' : ''} Grått/öppen punkt: färre än sex svar. Lucka: inga registrerade svar.</p>
    <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium text-teal-800">Visa siffror dag för dag</summary>
      <div className="mt-2 overflow-x-auto"><table aria-label="Utveckling dag för dag" className="w-full text-left"><thead><tr><th>Datum</th><th>Svar</th><th>Rätt</th><th>Andel rätt</th>{cohort && <><th>Övrigas svar</th><th>Övrigas rätt</th><th>Övrigas andel</th></>}<th>Underlag</th></tr></thead>
        <tbody>{daily.map((day, index) => <tr key={day.date} className="border-t border-slate-100"><th className="py-1 text-left font-normal">{day.date}</th><td>{day.available ? day.attempts : '–'}</td><td>{day.available ? day.correct : '–'}</td><td>{pct(day.accuracy)}</td>
          {cohort && <><td>{peers[index]?.available ? peers[index].attempts : '–'}</td><td>{peers[index]?.available ? peers[index].correct : '–'}</td><td>{pct(peers[index]?.accuracy)}</td></>}
          <td>{!day.available ? 'Underlag saknas' : !subject.historyComplete ? 'Begränsad historik' : day.attempts === 0 ? 'Inga svar' : day.smallSample ? 'Litet underlag' : `${day.attempts} svar`}</td></tr>)}</tbody>
      </table></div>
    </details>
  </div>
}
