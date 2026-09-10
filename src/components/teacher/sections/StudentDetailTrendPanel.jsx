import { useId } from 'react'
import { TREND_MIN_ATTEMPTS } from '../../../lib/studentDailyTrend'

const WIDTH = 700
const LEFT = 44
const RIGHT = 14
const TOP = 18
const BOTTOM = 112
const HEIGHT = 143
const PLOT_HEIGHT = BOTTOM - TOP
const percentage = value => value === null ? '—' : `${Math.round(value * 100)} %`

export default function StudentDetailTrendPanel({ trend }) {
  const id = useId()
  const { days, historyComplete, excludedEntries } = trend
  const totalAttempts = days.reduce((sum, day) => sum + day.attempts, 0)
  const totalCorrect = days.reduce((sum, day) => sum + day.correct, 0)
  const step = (WIDTH - LEFT - RIGHT) / days.length
  const x = index => LEFT + (index + 0.5) * step
  const y = rate => BOTTOM - rate * PLOT_HEIGHT
  const maxAttempts = Math.max(1, ...days.map(day => day.attempts))
  const countTicks = [...new Set([0, Math.round(maxAttempts / 2), maxAttempts])]

  return (
    <section aria-labelledby={`${id}-heading`} className="my-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3 md:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`${id}-heading`} className="text-base font-semibold text-slate-900">Träning över 14 dagar</h3>
          <p className="mt-1 text-xs text-slate-600">
            {days[0].date}–{days.at(-1).date} · Svensk tid (Stockholm) · Idag hittills
          </p>
        </div>
        <p className="text-sm tabular-nums text-slate-700">
          {totalAttempts} sparade svar · {totalCorrect} rätt
        </p>
      </div>

      {!historyComplete && (
        <p className="mt-3 rounded border border-slate-300 bg-white p-2 text-sm text-slate-700">
          <strong>Begränsad historik.</strong> Den sparade historiken kan vara ofullständig.
          Antal och andel rätt gäller bara sparade svar. En tom dag betyder inte säkert att eleven inte tränade.
          {excludedEntries > 0 && ' Poster med ogiltig tid, framtida tid eller saknat resultat har utelämnats.'}
        </p>
      )}

      <p className="mt-3 text-sm text-slate-600">
        Uppgifter och svårighetsgrad kan skilja sig mellan dagarna. Andel rätt visar resultat på de
        sparade uppgifterna och är inget mått på kunskapsutveckling.
      </p>
      {totalAttempts === 0 && (
        <p className="mt-2 text-sm text-slate-700">Inga sparade svar under perioden.</p>
      )}

      <div className="mt-4 overflow-x-auto rounded bg-white focus-visible:outline-2 focus-visible:outline-blue-700"
        role="region" aria-label="Diagram för 14 dagar, kan rullas i sidled" tabIndex={0}>
        <div className="min-w-[560px] p-2">
          <h4 className="text-xs font-semibold text-slate-700">Antal svar · staplar</h4>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full" role="img"
            aria-label="Antal sparade svar per dag. Exakta värden finns i tabellen nedanför.">
            {countTicks.map(tick => (
              <g key={tick}>
                <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(tick / maxAttempts)} y2={y(tick / maxAttempts)} stroke="#e2e8f0" />
                <text x={LEFT - 8} y={y(tick / maxAttempts) + 4} textAnchor="end" fontSize="11" fill="#475569">{tick}</text>
              </g>
            ))}
            {days.map((day, index) => (
              <g key={day.date}>
                <rect x={x(index) - step * 0.27} y={y(day.attempts / maxAttempts)}
                  width={step * 0.54} height={day.attempts / maxAttempts * PLOT_HEIGHT}
                  rx="2" fill={day.smallSample ? '#94a3b8' : '#2563eb'}>
                  <title>{`${day.date}: ${day.attempts} sparade svar`}</title>
                </rect>
                <text x={x(index)} y={BOTTOM + 20} textAnchor="middle" fontSize="11" fill="#475569">{day.dateLabel}</text>
              </g>
            ))}
          </svg>

          <h4 className="mt-2 text-xs font-semibold text-slate-700">Andel rätt · punkter och linje · 0–100 %</h4>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full" role="img"
            aria-label="Andel rätt per dag. Grå öppna punkter betyder färre än sex svar. Linjen bryts vid små underlag och tomma dagar.">
            {[0, 0.5, 1].map(tick => (
              <g key={tick}>
                <line x1={LEFT} x2={WIDTH - RIGHT} y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" />
                <text x={LEFT - 8} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="#475569">{tick * 100} %</text>
              </g>
            ))}
            {days.map((day, index) => {
              const previous = days[index - 1]
              return (
                <g key={day.date}>
                  {!day.smallSample && previous && !previous.smallSample && (
                    <line x1={x(index - 1)} y1={y(previous.accuracy)} x2={x(index)} y2={y(day.accuracy)}
                      stroke="#1e40af" strokeWidth="2" />
                  )}
                  {day.accuracy !== null && (
                    <circle cx={x(index)} cy={y(day.accuracy)} r="4"
                      fill={day.smallSample ? 'white' : '#1e40af'}
                      stroke={day.smallSample ? '#64748b' : '#1e40af'} strokeWidth="2">
                      <title>{`${day.date}: ${percentage(day.accuracy)} (${day.correct} av ${day.attempts} rätt)${day.smallSample ? ' · Litet underlag' : ''}`}</title>
                    </circle>
                  )}
                  <text x={x(index)} y={BOTTOM + 20} textAnchor="middle" fontSize="11" fill="#475569">{day.dateLabel}</text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Grå stapel och öppen grå punkt: färre än {TREND_MIN_ATTEMPTS} svar den dagen.
        Ingen punkt: inga sparade svar. Linjen binder bara ihop dagar intill varandra med minst {TREND_MIN_ATTEMPTS} svar.
        Gränsen är en försiktighetsmarkering, inte ett statistiskt säkerhetsmått.
      </p>

      <details className="mt-3 rounded border border-slate-200 bg-white">
        <summary className="cursor-pointer p-3 text-sm font-medium text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-700">
          Visa siffror för alla 14 dagar
        </summary>
        <div className="overflow-x-auto px-3 pb-3">
          <table className="w-full text-left text-xs tabular-nums">
            <caption className="sr-only">Samma sparade svar som i diagrammen, per kalenderdag i Stockholm</caption>
            <thead className="border-b text-slate-600">
              <tr>
                {['Datum', 'Antal svar', 'Rätt', 'Andel rätt', 'Underlag'].map(label => (
                  <th key={label} scope="col" className="px-2 py-2">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day.date} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="whitespace-nowrap px-2 py-2 font-medium text-slate-800">{day.date}{day.isToday ? ' (idag)' : ''}</th>
                  <td className="px-2 py-2">{day.attempts}</td>
                  <td className="px-2 py-2">{day.correct}</td>
                  <td className="px-2 py-2">{percentage(day.accuracy)}</td>
                  <td className="px-2 py-2 text-slate-600">{day.attempts === 0 ? 'Inga sparade svar' : day.smallSample ? 'Litet underlag' : `${day.attempts} sparade svar`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
