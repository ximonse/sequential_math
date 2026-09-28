import { useMemo, useState } from 'react'
import { buildTablePracticeOverview, sortTablePracticeOverviewRows, TABLE_NUMBERS } from './tablePracticeOverview'

const percentage = value => Number.isFinite(value) ? `${Math.round(value * 100)}%` : '–'
const seconds = value => Number.isFinite(value) ? value.toFixed(1).replace('.', ',') : '–'

function completionAppearance(status, cohort) {
  if (cohort) return 'border-slate-300 bg-slate-100 text-slate-800'
  if (status?.todayCompleted) return 'border-emerald-700 bg-emerald-600 text-white'
  if (status?.weekCompleted) return 'border-emerald-600 bg-emerald-100 text-emerald-950'
  if (status?.knownEver) return 'border-emerald-600 bg-white text-slate-900'
  return 'border-dashed border-slate-400 bg-slate-100 text-slate-700'
}

function speedBar(summary, available) {
  if (!available || summary.speedSamples < 5 || !Number.isFinite(summary.medianTimeSec)) return 'bg-slate-400'
  if (summary.medianTimeSec < 3) return 'bg-teal-700'
  if (summary.medianTimeSec <= 5) return 'bg-amber-500'
  return 'bg-rose-600'
}

function TableCell({ item, table, onOpenTableProgress, cohort = false }) {
  const summary = item?.current
  const available = item?.available === true
  const attempts = available ? summary.attempts : 0
  const speed = available ? summary.medianTimeSec : null
  const status = item?.completionStatus
  const completionLabel = cohort
    ? `${item.completedPupils} av ${item.totalPupils} elever har en belagd hel tabell`
    : status?.todayCompleted ? 'Hel tabell klarad idag'
      : status?.weekCompleted ? 'Hel tabell klarad senaste 7 dagarna'
        : status?.knownEver ? 'Hel tabell klarad tidigare' : 'Ingen hel tabell belagd i sparad historik'
  const title = !available
    ? `${table}:ans tabell: ${completionLabel}. Svarsunderlag saknas`
    : `${table}:ans tabell: ${completionLabel}. ${cohort ? '' : `${summary.factorsCorrect}/10 olika tal rätt i vald period. `}${summary.correct} rätt av ${attempts} svar, ${percentage(summary.accuracy)} rätt, median ${seconds(speed)} sekunder från ${summary.speedSamples} ostörda korrekta svar${item.historyComplete ? '' : '. Begränsad historik'}`
  return <td className="px-0.5 py-1 text-center">
    <button type="button" title={title} aria-label={title} onClick={onOpenTableProgress}
      className="group/cell mx-auto flex min-w-[49px] flex-col items-center rounded-md py-0.5 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700">
      <span className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-[13px] font-bold tabular-nums ${completionAppearance(status, cohort)}`}>
        <span>{seconds(speed)}</span>
        <span aria-hidden="true" className={`absolute bottom-1 h-1 w-4 rounded-full ${speedBar(summary || { speedSamples: 0 }, available)}`} />
      </span>
      <span className="mt-0.5 whitespace-nowrap text-[11px] tabular-nums text-slate-700">{cohort ? `${item.completedPupils}/${item.totalPupils}` : available ? `${summary.factorsCorrect}/10` : '–/10'}</span>
      <span className="whitespace-nowrap text-[11px] tabular-nums text-slate-600">{available ? `${percentage(summary.accuracy)}·${attempts}` : '–'}</span>
    </button>
  </td>
}

export default function TablePracticeOverviewPanel({ students = [], days = 14, onDaysChange, onOpenStudentDetail, onOpenTableProgress, collapseControl }) {
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const overview = useMemo(() => buildTablePracticeOverview(students, days), [students, days])
  const rows = useMemo(() => sortTablePracticeOverviewRows(overview.rows, sortBy, sortDir), [overview.rows, sortBy, sortDir])
  const sort = key => {
    if (sortBy === key) setSortDir(previous => previous === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }
  const limitedHistory = overview.rows.some(row => TABLE_NUMBERS.some(table => !row.tables[table]?.historyComplete))

  return <section aria-label="Tabellöversikt – hela klassen" className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm sm:p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Tabellöversikt – hela klassen</h2>
        <p className="text-sm text-slate-600">Tabellträning per elev. Grönt visar en belagd hel tabell; siffran visar mediansekunder för rätta svar.</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">Period
          <select aria-label="Period för tabellöversikt" value={days} onChange={event => onDaysChange?.(Number(event.target.value))}
            className="ml-2 rounded border border-slate-300 bg-white px-2 py-1 text-sm">
            <option value={7}>7 dagar</option><option value={14}>14 dagar</option>
          </select>
        </label>
        {collapseControl}
      </div>
    </div>
    <div className="my-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      <span>{overview.period.start}–{overview.period.end}</span>
      <span><span className="font-semibold text-emerald-800">Grön kant</span> hel runda tidigare</span>
      <span><span className="font-semibold text-emerald-800">Ljusgrön</span> senaste 7 dagarna</span>
      <span><span className="font-semibold text-emerald-800">Grön</span> idag</span>
      <span><span className="font-semibold text-slate-600">Grå streckad</span> ingen sparad hel runda</span>
      <span><span className="font-semibold text-rose-700">Rött tidsstreck</span> över 5 s; grått vid färre än 5 ostörda tider</span>
    </div>
    {students.length === 0 ? <p className="text-sm text-slate-600">Inga elever i urvalet.</p> : <>
      <div className="overflow-x-auto rounded border border-slate-200">
        <table aria-label="Tabellträning per elev och tabell" className="w-full border-collapse text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <th scope="col" aria-sort={sortBy === 'name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="sticky left-0 z-10 w-28 min-w-28 bg-slate-50 px-2 py-2 text-left">
              <button type="button" onClick={() => sort('name')} className="font-semibold hover:text-teal-800 hover:underline">Elev <span aria-hidden="true">{sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span></button>
            </th>
            {TABLE_NUMBERS.map(table => <th key={table} scope="col" aria-sort={sortBy === table ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="min-w-[51px] whitespace-nowrap px-0.5 py-2 text-center">
              <button type="button" onClick={() => sort(table)} title={`Sortera ${table}:ans tabell efter mediansekunder`} className="font-semibold hover:text-teal-800 hover:underline">
                {table}:an <span aria-hidden="true">{sortBy === table ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
              </button>
            </th>)}
          </tr></thead>
          <tbody>{rows.map((row, index) => <tr key={row.studentId} className={`border-b border-slate-100 ${index % 2 ? 'bg-slate-50/50' : 'bg-white'}`}>
            <th scope="row" className={`sticky left-0 z-10 w-28 min-w-28 px-2 py-1.5 text-left font-medium ${index % 2 ? 'bg-slate-50' : 'bg-white'}`}>
              <button type="button" onClick={() => onOpenStudentDetail?.(row.studentId)} className="block max-w-24 truncate text-left text-slate-800 hover:text-teal-800 hover:underline" title={row.name}>{row.name}</button>
            </th>
            {TABLE_NUMBERS.map(table => <TableCell key={table} item={row.tables[table]} table={table}
              onOpenTableProgress={() => onOpenTableProgress?.(table, row.studentId)} />)}
          </tr>)}</tbody>
          <tfoot><tr className="border-t-2 border-slate-300 bg-slate-50">
            <th scope="row" className="sticky left-0 z-10 w-28 min-w-28 bg-slate-50 px-2 py-2 text-left font-semibold text-slate-700">Hela urvalet</th>
            {TABLE_NUMBERS.map(table => <TableCell key={table} item={overview.cohorts[table]} table={table} cohort
              onOpenTableProgress={() => onOpenTableProgress?.(table, '')} />)}
          </tr></tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-600">Under cirkeln: olika tal rätt av 10 i vald period, sedan andel rätt · antal svar. För hela urvalet visas i stället antal elever med belagd hel tabell. Tidsstreck: grönt &lt;3 s, gult 3–5 s, rött &gt;5 s; färg kräver minst 5 ostörda korrekta tider. Välj en tabellrubrik för snabbast/långsammast. Tiden är medianen av korrekta svar utan registrerade avbrott.</p>
      {limitedHistory && <p role="status" className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Begränsad historik eller underlag saknas för minst en elev. En tom markör betyder inte att eleven inte tränat.</p>}
    </>}
  </section>
}
