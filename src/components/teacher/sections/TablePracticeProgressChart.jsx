const pct = value => Number.isFinite(value) ? `${Math.round(value * 100)}%` : '–'
const shortDate = value => `${Number(value.slice(8))}/${Number(value.slice(5, 7))}`
const sec = value => Number.isFinite(value) ? `${value.toFixed(1).replace('.', ',')} s` : '–'
const TIME_BASE = 310
const TIME_HEIGHT = 60

export default function TablePracticeProgressChart({ subject, cohort, name, unit = 'day' }) {
  const daily = subject.daily || []
  if (daily.length === 0) return null
  const weekly = unit === 'week'
  const pointLabel = date => weekly ? `v. från ${shortDate(date)}` : shortDate(date)
  const labelEvery = Math.max(1, Math.ceil(daily.length / 14))
  const width = 640
  const left = 30
  const plotWidth = width - left - 16
  const step = plotWidth / daily.length
  const x = index => left + step * (index + 0.5)
  const maxCount = Math.max(1, ...daily.map(day => day.attempts))
  const peers = cohort?.daily || []
  const maxTime = Math.max(5, ...[...daily, ...peers].map(day => Number.isFinite(day.medianTimeSec) ? Math.ceil(day.medianTimeSec) : 0))
  const timeY = value => TIME_BASE - value / maxTime * TIME_HEIGHT
  const timePoints = (series, color) => series.map((day, index) => {
    if (!Number.isFinite(day.medianTimeSec)) return null
    const previous = series[index - 1]
    const few = day.speedSamples < 5
    return <g key={`time-${color}-${day.date}`}>
      {previous && Number.isFinite(previous.medianTimeSec) && previous.speedSamples >= 5 && !few
        ? <line x1={x(index - 1)} y1={timeY(previous.medianTimeSec)} x2={x(index)} y2={timeY(day.medianTimeSec)} stroke={color} strokeWidth="2" /> : null}
      <circle cx={x(index)} cy={timeY(day.medianTimeSec)} r="4" fill={few ? 'white' : color} stroke={few ? '#64748b' : color} strokeWidth="2"><title>{pointLabel(day.date)}: median {sec(day.medianTimeSec)} ({day.speedSamples} tider){few ? ', färre än 5 tider' : ''}</title></circle>
    </g>
  })
  const points = (series, color) => series.map((day, index) => {
    if (!Number.isFinite(day.accuracy)) return null
    const previous = series[index - 1]
    const y = 210 - day.accuracy * 70
    return <g key={`${color}-${day.date}`}>
      {previous && !previous.smallSample && !day.smallSample && Number.isFinite(previous.accuracy)
        ? <line x1={x(index - 1)} y1={210 - previous.accuracy * 70} x2={x(index)} y2={y} stroke={color} strokeWidth="2" /> : null}
      <circle cx={x(index)} cy={y} r="4" fill={day.smallSample ? 'white' : color} stroke={day.smallSample ? '#64748b' : color} strokeWidth="2"><title>{pointLabel(day.date)}: {day.correct}/{day.attempts} rätt, {pct(day.accuracy)}{day.smallSample ? ', litet underlag' : ''}</title></circle>
    </g>
  })
  return <div className="mt-4">
    <h3 className="text-sm font-semibold">Träning över tid · {name}</h3>
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} 340`} role="img" aria-label={`Antal svar, andel rätt och mediantid ${weekly ? 'vecka för vecka' : 'dag för dag'} för ${name}`} className="w-full min-w-96">
      <text x="0" y="14" fontSize="11" fill="#475569">Antal svar</text>
      <line x1={left} y1="102" x2={width - 16} y2="102" stroke="#cbd5e1" />
      {daily.map((day, index) => <g key={day.date}>
        <rect x={x(index) - step * 0.27} y={102 - day.attempts / maxCount * 62} width={step * 0.54} height={day.attempts / maxCount * 62} fill={day.smallSample ? '#94a3b8' : '#0f766e'} rx="2"><title>{pointLabel(day.date)}: {day.attempts} svar</title></rect>
        <text x={x(index)} y={Math.min(96, 96 - day.attempts / maxCount * 62)} textAnchor="middle" fontSize="10" fill="#334155">{day.available ? day.attempts : '–'}</text>
        {index % labelEvery === 0 && <text x={x(index)} y="333" textAnchor="middle" fontSize="9" fill="#475569">{shortDate(day.date)}</text>}
      </g>)}
      <text x="0" y="127" fontSize="11" fill="#475569">Andel rätt</text>
      {[0, 0.5, 1].map(rate => <g key={rate}><line x1={left} y1={210 - rate * 70} x2={width - 16} y2={210 - rate * 70} stroke="#e2e8f0" /><text x="1" y={213 - rate * 70} fontSize="9" fill="#64748b">{rate * 100}</text></g>)}
      {points(peers, '#b45309')}{points(daily, '#0f766e')}
      <text x="0" y="237" fontSize="11" fill="#475569">Mediantid rätt svar (lägre är snabbare)</text>
      {[0, maxTime / 2, maxTime].map(value => <g key={`t-${value}`}><line x1={left} y1={timeY(value)} x2={width - 16} y2={timeY(value)} stroke="#e2e8f0" /><text x="1" y={timeY(value) + 3} fontSize="9" fill="#64748b">{Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',')}</text></g>)}
      {timePoints(peers, '#b45309')}{timePoints(daily, '#0f766e')}
    </svg></div>
    <p className="text-xs text-slate-600">Grönt: {name}.{cohort ? ' Orange: övriga i urvalet.' : ''} Grått/öppen punkt: färre än sex svar, eller färre än fem ostörda tider för mediantiden. Lucka: inga registrerade svar.{weekly ? ' Varje punkt är en vecka (måndag–söndag).' : ''}{weekly && cohort ? ' Övrigas tid är medianen av elevernas veckomedianer.' : ''}</p>
    <details className="mt-2 text-xs"><summary className="cursor-pointer font-medium text-teal-800">Visa siffror {weekly ? 'vecka för vecka' : 'dag för dag'}</summary>
      <div className="mt-2 overflow-x-auto"><table aria-label={weekly ? 'Utveckling vecka för vecka' : 'Utveckling dag för dag'} className="w-full text-left"><thead><tr><th>{weekly ? 'Vecka från' : 'Datum'}</th><th>Svar</th><th>Rätt</th><th>Andel rätt</th><th>Median</th>{cohort && <><th>Övrigas svar</th><th>Övrigas rätt</th><th>Övrigas andel</th></>}<th>Underlag</th></tr></thead>
        <tbody>{daily.map((day, index) => <tr key={day.date} className="border-t border-slate-100"><th className="py-1 text-left font-normal">{day.date}</th><td>{day.available ? day.attempts : '–'}</td><td>{day.available ? day.correct : '–'}</td><td>{pct(day.accuracy)}</td><td>{sec(day.medianTimeSec)}</td>
          {cohort && <><td>{peers[index]?.available ? peers[index].attempts : '–'}</td><td>{peers[index]?.available ? peers[index].correct : '–'}</td><td>{pct(peers[index]?.accuracy)}</td></>}
          <td>{!day.available ? 'Underlag saknas' : !subject.historyComplete ? 'Begränsad historik' : day.attempts === 0 ? 'Inga svar' : day.smallSample ? 'Litet underlag' : `${day.attempts} svar`}</td></tr>)}</tbody>
      </table></div>
    </details>
  </div>
}
