import { useEffect, useRef } from 'react'
import DiagnosticScreeningCell from './DiagnosticScreeningCell'
import QuestionText from '../../QuestionText'

const statuses = { not_started: 'Inte påbörjat', in_progress: 'Påbörjat', submitted: 'Alla inlämnade' }
// `highlight` holds `studentId:position` keys of the answers behind a chosen misconception card.
export default function DiagnosticScreeningMatrix({ overview, name, onOpen, highlight }) {
  const scroller = useRef(null)
  // A wide table scrolls sideways to the first framed answer; the page itself stays put.
  useEffect(() => {
    const box = scroller.current, cell = box?.querySelector('[data-highlighted]')
    if (!box || !cell) return
    const left = cell.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft
    // The pupil column stays in place, so the cell must clear it.
    const names = box.querySelector('th[scope=row]')?.offsetWidth ?? 0
    if (left - names < box.scrollLeft || left + cell.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollLeft = Math.max(0, left - names - 24)
  }, [highlight])
  // The teacher's judgement, when saved for the current revision, is what the table counts.
  const status = item => item.teacherAssessment?.answerStatus || item.screening?.answerStatus
  const correct = item => status(item) === 'correct'
  const answered = item => ['correct', 'incorrect'].includes(status(item))
  const automatic = item => item.answerType !== 'text' || item.automaticallyMarked === true
  return <>
    <div className="my-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700" aria-label="Svarsfärger">
      <span>🟩 Rätt svar</span><span>⬜ Ej svar / ofullständigt</span><span>🟥 Fel svar</span>
      <span>M · Möjligt metodfel</span><span>P · Kolumnförskjutning</span><span>Ö · Olika svar</span>
      <span>L · Lärarbedömt</span><span>F · Felförståelse markerad av lärare</span>
    </div>
    <div ref={scroller} className="overflow-x-auto"><table className="w-full text-center text-sm tabular-nums">
      <caption className="sr-only">Screening: elevens svar per uppgift</caption>
      <thead className="bg-slate-50 text-xs text-slate-700"><tr><th scope="col" className="sticky left-0 z-[1] bg-slate-50 p-2 text-left">Elev</th>
        {overview.items.map((item, index) => {
          const label = item.promptSv.replace(/^Räkna ut /u, '').replace(/\.$/u, '')
          return <th scope="col" key={item.assignmentItemId} className="p-2" title={item.promptSv}><span>{index + 1}</span>
            <span className="block max-w-[28ch] overflow-hidden text-ellipsis whitespace-nowrap font-normal"><QuestionText>{label}</QuestionText></span></th>
        })}
        <th scope="col" className="p-2">Rätt svar</th><th scope="col" className="p-2">Inlämnade</th><th scope="col" className="p-2">Genomgångna</th></tr></thead>
      <tbody>{overview.rows.map(row => <tr key={row.studentId} className="border-t border-slate-200">
        <th scope="row" className="sticky left-0 z-[1] min-w-36 bg-white p-2 text-left font-medium">{name(row.studentId)}<small className="block text-xs font-normal text-slate-500">{statuses[row.status]}</small></th>
        {row.items.map((item, index) => <td key={item.assignmentItemId} data-highlighted={highlight?.has(`${row.studentId}:${index}`) || undefined} className={`p-1${!highlight ? '' : highlight.has(`${row.studentId}:${index}`) ? ' outline outline-[3px] -outline-offset-[3px] outline-indigo-600' : ' opacity-35'}`}><DiagnosticScreeningCell item={item} pupilName={name(row.studentId)} prompt={overview.items[index].promptSv} onOpen={value => onOpen({ ...value, studentId: row.studentId })} /></td>)}
        <td className="p-2 text-xs text-slate-600">{overview.items.some(automatic)
          ? `${row.items.filter(correct).length} / ${overview.items.filter(automatic).length}` : 'Skrivsvar'}</td>
        <td className="p-2 text-xs text-slate-600">{row.submitted} / {overview.items.length}</td>
        <td className="p-2 text-xs text-slate-600">{row.reviewed} / {overview.items.length}</td>
      </tr>)}</tbody>
      <tfoot className="border-t border-slate-200 text-xs text-slate-600"><tr><th className="sticky left-0 z-[1] bg-white p-2 text-left">Rätt / besvarade</th>{overview.items.map(item => {
        const column = overview.rows.map(row => row.items.find(value => value.assignmentItemId === item.assignmentItemId))
        return <td key={item.assignmentItemId} className="p-2">{!automatic(item) ? 'Lärarbedömning'
          : `${column.filter(correct).length} / ${column.filter(answered).length}`}</td>
      })}<td colSpan={3} /></tr></tfoot>
    </table></div>
    <p className="mt-2 text-xs text-slate-600">Peka på ett svar för facit och analyssignaler. Klicka för uträkningen. Rätt svar betyder inte att metoden är granskad. Pågående svar kan ändras. Lärarbedömningar sätts i elevgenomgången.{highlight ? ' Ram = svar som hör till det valda felförståelsekortet. Klicka kortet igen för att ta bort markeringen.' : ''}</p>
  </>
}
