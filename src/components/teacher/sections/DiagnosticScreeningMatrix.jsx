import DiagnosticScreeningCell from './DiagnosticScreeningCell'

const statuses = { not_started: 'Inte påbörjat', in_progress: 'Påbörjat', submitted: 'Alla inlämnade' }
export default function DiagnosticScreeningMatrix({ overview, name, onOpen }) {
  const correct = item => item.screening?.answerStatus === 'correct'
  const answered = item => ['correct', 'incorrect'].includes(item.screening?.answerStatus)
  return <>
    <div className="my-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700" aria-label="Svarsfärger">
      <span>🟩 Rätt svar</span><span>⬜ Ej svar / ofullständigt</span><span>🟥 Fel svar</span>
      <span>M · Möjligt metodfel</span><span>P · Kolumnförskjutning</span><span>Ö · Olika svar</span>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-center text-sm tabular-nums">
      <caption className="sr-only">Screening: elevens svar per uppgift</caption>
      <thead className="bg-slate-50 text-xs text-slate-700"><tr><th scope="col" className="p-2 text-left">Elev</th>
        {overview.items.map((item, index) => <th scope="col" key={item.assignmentItemId} className="p-2"><span>{index + 1}</span><span className="block whitespace-nowrap font-normal">{item.promptSv.replace(/^Räkna ut /u, '').replace(/\.$/u, '')}</span></th>)}
        <th scope="col" className="p-2">Rätt svar</th><th scope="col" className="p-2">Inlämnade</th><th scope="col" className="p-2">Genomgångna</th></tr></thead>
      <tbody>{overview.rows.map(row => <tr key={row.studentId} className="border-t border-slate-200">
        <th scope="row" className="min-w-36 p-2 text-left font-medium">{name(row.studentId)}<small className="block text-xs font-normal text-slate-500">{statuses[row.status]}</small></th>
        {row.items.map((item, index) => <td key={item.assignmentItemId} className="p-1"><DiagnosticScreeningCell item={item} pupilName={name(row.studentId)} prompt={overview.items[index].promptSv} onOpen={value => onOpen({ ...value, studentId: row.studentId })} /></td>)}
        <td className="p-2 text-xs text-slate-600">{overview.items.some(item => item.answerType !== 'text')
          ? `${row.items.filter(correct).length} / ${overview.items.filter(item => item.answerType !== 'text').length}` : 'Skrivsvar'}</td>
        <td className="p-2 text-xs text-slate-600">{row.submitted} / {overview.items.length}</td>
        <td className="p-2 text-xs text-slate-600">{row.reviewed} / {overview.items.length}</td>
      </tr>)}</tbody>
      <tfoot className="border-t border-slate-200 text-xs text-slate-600"><tr><th className="p-2 text-left">Rätt / besvarade</th>{overview.items.map(item => {
        const column = overview.rows.map(row => row.items.find(value => value.assignmentItemId === item.assignmentItemId))
        return <td key={item.assignmentItemId} className="p-2">{item.answerType === 'text' ? 'Lärarbedömning'
          : `${column.filter(correct).length} / ${column.filter(answered).length}`}</td>
      })}<td colSpan={3} /></tr></tfoot>
    </table></div>
    <p className="mt-2 text-xs text-slate-600">Peka på ett svar för facit och analyssignaler. Klicka för uträkningen. Rätt svar betyder inte att metoden är granskad. Pågående svar kan ändras.</p>
  </>
}
