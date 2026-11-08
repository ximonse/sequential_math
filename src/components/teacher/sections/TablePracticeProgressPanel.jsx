import { useMemo, useState } from 'react'
import { TABLE_PERIODS, buildTablePracticeProgressForPeriod, normalizeTablePeriod } from '../../../lib/tablePracticeLongProgress'
import { downloadTextFile, rowsToCsv } from './dashboardExportHelpers'
import TablePracticeProgressChart from './TablePracticeProgressChart'
import { TABLE_STUDENT_COLUMNS, defaultTableStudentSortDir, sortTableStudents } from './tablePracticeProgressSort'

const DEFAULT_SELECTION = { table: 7, period: '7d', studentId: '' }
const TABLES = Array.from({ length: 11 }, (_, index) => index + 2)
const percent = value => Number.isFinite(value) ? `${Math.round(value * 100)}%` : '–'
const seconds = value => Number.isFinite(value) ? `${value.toFixed(1).replace('.', ',')} s` : '–'
const dateLabel = value => value ? `${Number(value.slice(8))}/${Number(value.slice(5, 7))}` : ''
const change = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return 'oförändrat'
  return `${diff < 0 ? '−' : '+'}${Math.abs(diff).toFixed(1).replace('.', ',')} s`
}

function Evidence({ item }) {
  if (!item.available) return <span>Underlag saknas</span>
  return <span>{!item.historyComplete ? 'Begränsad historik' : item.current.attempts === 0
    ? 'Inga registrerade svar' : item.current.smallSample ? 'Litet underlag' : `${item.current.attempts} svar`}</span>
}

function Metrics({ label, current, previous, available = true, hasPrevious = true, showBest = false }) {
  const before = text => hasPrevious ? <small className="block text-slate-500">tidigare {text}</small> : null
  const timeChange = hasPrevious ? change(current.medianTimeSec, previous.medianTimeSec) : null
  return <tr className="border-t border-slate-200">
    <th className="py-2 pr-3 text-left font-medium">{label}</th>
    <td className="px-2 py-2 tabular-nums">{available ? current.attempts : '–'}{before(available ? previous.attempts : '–')}</td>
    <td className="px-2 py-2 tabular-nums">{available ? `${current.correct}/${current.attempts}` : '–'}{before(available ? `${previous.correct}/${previous.attempts}` : '–')}</td>
    <td className="px-2 py-2 tabular-nums">{percent(current.accuracy)}{before(percent(previous.accuracy))}</td>
    <td className="px-2 py-2 tabular-nums">{seconds(current.medianTimeSec)} <span className="text-xs text-slate-500">({current.speedSamples} tider)</span>{before(`${seconds(previous.medianTimeSec)}${timeChange ? ` · ${timeChange}` : ''}`)}</td>
    <td className="px-2 py-2 tabular-nums">{showBest ? seconds(current.bestMedianSec) : '–'}</td>
  </tr>
}

export default function TablePracticeProgressPanel({ students = [], selection, onSelectionChange, onOpenStudentDetail, groupLabel, collapseControl }) {
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  const safeSelection = selection || DEFAULT_SELECTION
  const period = normalizeTablePeriod(safeSelection.period ?? safeSelection.days)
  const progress = useMemo(() => buildTablePracticeProgressForPeriod(students, { ...safeSelection, period }), [students, safeSelection, period])
  const unitWord = progress.unit === 'week' ? 'vecko' : 'dags'
  const sortedStudents = useMemo(() => sortTableStudents(progress.students, sortBy, sortDir), [progress.students, sortBy, sortDir])
  const handleSort = key => {
    if (sortBy === key) setSortDir(previous => previous === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir(defaultTableStudentSortDir(key)) }
  }
  const selected = progress.selectedStudent
  const subject = selected || progress.cohort
  const subjectName = selected?.name || groupLabel || 'Hela urvalet'
  const choose = change => onSelectionChange?.({ ...safeSelection, ...change })
  const exportCsv = () => {
    const subjects = [...progress.students, { ...progress.cohort, name: selected ? 'Övriga i urvalet' : 'Hela urvalet', studentId: '' }]
    const periods = progress.hasPrevious ? ['current', 'previous'] : ['current']
    const rows = subjects.flatMap(item => periods.map(period => ({
      Elev: item.studentId ? item.displayAlias : item.name, ElevID: item.studentId, Tabell: progress.table,
      Period: period === 'current' ? progress.periodLabel : progress.previousLabel,
      Fran: period === 'current' ? progress.currentStart : progress.previousStart,
      Till: period === 'current' ? progress.endDate : progress.previousEnd,
      Svar: item.available === false ? '' : item[period].attempts,
      Ratt: item.available === false ? '' : item[period].correct,
      AndelRatt: percent(item[period].accuracy), MedianRattSek: seconds(item[period].medianTimeSec),
      BastaMedianSek: period === 'current' && item.studentId ? seconds(item.current.bestMedianSec) : '',
      Tidsunderlag: item[period].speedSamples, FaktorerAv10: item[period].factorsCovered,
      AvslutadeRundor: item[period].completions,
      Underlag: item.available === false ? 'saknas' : !item.historyComplete ? 'begränsad historik' : item[period].smallSample ? 'färre än 6 svar' : 'sparad historik'
    })))
    downloadTextFile(rowsToCsv(rows), `tabell-${progress.table}_${progress.currentStart}_${progress.endDate}.csv`, 'text/csv;charset=utf-8;')
  }

  return <section id="table-practice-progress" aria-label="Tabellträning – utveckling" className="rounded-lg border border-slate-300 bg-white p-3 sm:p-4 text-slate-800">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-teal-800">{groupLabel || 'Vald klass eller grupp'}</p>
        <h2 className="text-xl font-semibold">Tabellträning – utveckling</h2>
        <p className="mt-1 text-sm text-slate-600">Följ träningen och jämför inom samma tabell.</p></div>
      <div className="flex items-center gap-2"><button type="button" onClick={exportCsv} disabled={students.length === 0} className="rounded border border-slate-300 px-1.5 py-0.5 text-sm hover:bg-slate-100 disabled:opacity-50">Exportera tabellunderlag</button>{collapseControl}</div>
    </div>
    <div className="my-3 flex flex-wrap gap-3 border-y border-slate-200 py-3">
      <label className="text-sm font-medium">Tabell
        <select aria-label="Tabell" value={progress.table} onChange={e => choose({ table: Number(e.target.value) })} className="ml-2 rounded border border-slate-300 px-1.5 py-0.5">
          {TABLES.map(table => <option key={table} value={table}>{table}:ans tabell</option>)}
        </select></label>
      <label className="text-sm font-medium">Period
        <select aria-label="Period" value={period} onChange={e => choose({ period: e.target.value })} className="ml-2 rounded border border-slate-300 px-1.5 py-0.5">
          {TABLE_PERIODS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select></label>
      <label className="text-sm font-medium">Elev att jämföra
        <select aria-label="Elev att jämföra" value={selected?.studentId || ''} onChange={e => choose({ studentId: e.target.value })} className="ml-2 max-w-full rounded border border-slate-300 px-1.5 py-0.5">
          <option value="">Hela urvalet</option>{progress.students.map(item => <option key={item.studentId} value={item.studentId}>{item.name}</option>)}
        </select></label>
    </div>
    {students.length === 0 ? <p className="text-sm">Inga elever i urvalet.</p> : <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <h3 className="font-semibold">{subjectName}</h3>
        <p>{progress.unit === 'week' ? `${progress.periodLabel} ` : ''}{dateLabel(progress.currentStart)}–{dateLabel(progress.endDate)}{progress.hasPrevious ? ` · tidigare ${progress.unit === 'week' && progress.previousLabel ? `${progress.previousLabel} ` : ''}${dateLabel(progress.previousStart)}–${dateLabel(progress.previousEnd)}` : ''}</p>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-slate-50">
        <table aria-label="Jämförelse" className="w-full text-sm"><thead><tr className="text-left text-slate-600">
          <th className="px-2 py-2">Urval</th><th className="px-2">Svar</th><th className="px-2">Rätt / svar</th><th className="px-2">Andel rätt</th><th className="px-2">Median rätt svar</th><th className="px-2" title={`Lägsta ${unitWord}median med minst 5 ostörda rätta svar`}>Bästa {unitWord}median</th>
        </tr></thead><tbody>
          {selected && <Metrics label={selected.name} {...selected} hasPrevious={progress.hasPrevious} showBest />}
          <Metrics label={selected ? 'Övriga i urvalet' : 'Hela urvalet'} {...progress.cohort} hasPrevious={progress.hasPrevious} />
        </tbody></table>
      </div>
      <p className="mt-2 text-xs text-slate-600">{progress.cohort.activeStudents} av {progress.cohort.includedStudents} {selected ? 'övriga ' : ''}elever har registrerade svar i perioden. Gruppens andel räknas på alla svar; elever som tränar mer väger mer.</p>
      {(!subject.historyComplete || !progress.cohort.historyComplete) && <p role="status" className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm">Begränsad historik eller underlag saknas. Siffrorna visar tillgängliga svar; en tom dag bevisar inte utebliven träning.</p>}
      <TablePracticeProgressChart subject={subject} cohort={selected ? progress.cohort : null} name={subjectName} unit={progress.unit} />
      <div className="mt-4 flex items-baseline justify-between gap-2"><h3 className="font-semibold">Elever · {progress.table}:ans tabell</h3><span className="text-xs text-slate-500">Välj ett namn för jämförelse</span></div>
      <div className="mt-1 overflow-x-auto">
        <table aria-label="Tabellresultat per elev" className="w-full text-sm"><thead><tr className="border-b border-slate-300 text-left text-xs text-slate-600">
          {TABLE_STUDENT_COLUMNS.map(([key, label]) => <th key={key} scope="col" aria-sort={sortBy === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="py-2 pr-2 whitespace-nowrap">
            <button type="button" onClick={() => handleSort(key)} className="font-semibold hover:text-teal-800 hover:underline">
              {label} <span aria-hidden="true">{sortBy === key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
            </button>
          </th>)}
        </tr></thead><tbody>{sortedStudents.map(item => <tr key={item.studentId} className={`border-b border-slate-100 ${selected?.studentId === item.studentId ? 'bg-teal-50' : ''}`}>
          <th className="py-2 pr-2 text-left font-medium"><button type="button" onClick={() => choose({ studentId: item.studentId })} className="text-teal-800 underline decoration-teal-300 underline-offset-2">{item.name}</button></th>
          <td className="pr-2 tabular-nums">{item.available ? item.current.attempts : '–'}</td><td className="pr-2 tabular-nums">{item.available ? item.current.correct : '–'}</td>
          <td className={`pr-2 tabular-nums ${item.current.smallSample ? 'text-slate-500' : ''}`}>{percent(item.current.accuracy)}</td>
          <td className="pr-2 text-slate-500 tabular-nums" title={`${item.previous.correct} rätt av ${item.previous.attempts} svar`}>{progress.hasPrevious ? <>{percent(item.previous.accuracy)} <small>({item.previous.attempts})</small></> : '–'}</td>
          <td className="pr-2 tabular-nums" title={`${item.current.speedSamples} ostörda, korrekta svar`}>{seconds(item.current.medianTimeSec)}<small className="block text-slate-500">{item.current.speedSamples} tider{progress.hasPrevious && change(item.current.medianTimeSec, item.previous.medianTimeSec) ? ` · ${change(item.current.medianTimeSec, item.previous.medianTimeSec)}` : ''}</small></td>
          <td className="pr-2 tabular-nums" title={`Lägsta ${unitWord}median med minst 5 ostörda rätta svar`}>{seconds(item.current.bestMedianSec)}</td>
          <td className="pr-2 tabular-nums">{item.available ? `${item.current.factorsCovered}/10` : '–'}</td>
          <td className="pr-2 tabular-nums">{item.available ? item.current.completions : '–'}</td><td className="text-xs text-slate-500"><Evidence item={item} /></td>
        </tr>)}</tbody></table>
      </div>
      {selected && <button type="button" onClick={() => onOpenStudentDetail?.(selected.studentId)} className="mt-3 rounded border border-slate-300 px-1.5 py-0.5 text-sm hover:bg-slate-100">Öppna {selected.name}s elevprofil</button>}
      <details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer font-medium">Så läser du underlaget</summary>
        <p className="mt-2">Endast tabellträning ingår. Faktorer visar hur många av talen 1–10 som tränats; fördelningen kan skilja mellan elever och perioder. Rundor är sparade avslutade tabellrundor, inte ett kunskapsbetyg.</p>
        <p className="mt-1">Färre än sex svar är ett litet underlag. Medianen använder bara korrekta svar utan registrerade avbrott. Snabbare svar eller högre rättandel är inte i sig bevis på ökat kunnande.</p>
        <p className="mt-1">Bästa är den lägsta {unitWord}medianen med minst fem ostörda rätta svar, inte ett enskilt snabbt svar. Förändringen jämför medianen med föregående period; minus betyder snabbare.</p>
        <p className="mt-1">Dagar följer svensk tid. Idag är ännu inte ett helt dygn. 7, 14 och 30 dagar jämförs med lika lång period före. Terminer: HT augusti–december, VT januari–juni; juli räknas bara i Totalt. Denna termin jämförs med förra, förra terminen med terminen innan. Totalt har ingen jämförelse. Långa perioder visas vecka för vecka; övrigas tid i diagrammet är medianen av elevernas veckomedianer. Elevloggen sparar de senaste 5 000 svaren; äldre svar kan saknas och markeras då som begränsad historik. Generell multiplikationsnivå och progression ändras inte av denna vy.</p>
      </details>
    </>}
  </section>
}
