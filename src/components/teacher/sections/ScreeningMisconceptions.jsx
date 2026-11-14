import { useEffect, useMemo, useState } from 'react'
import { diagnosticRequest } from './diagnosticRequest'
import QuestionText from '../../QuestionText'
import { screeningMisconceptionView } from '../../../lib/screeningMisconceptions.js'

// Misconceptions in the chosen screening (docs/STYRNING_FELFORSTAELSER.md, step 4).
// Read-only: follow-up stays frozen. Clicking a card marks its answers in the
// results table below.
const OTHER_BOXES = [
  ['gave_up', 'Ger upp eller klickar förbi', 'Svarar 0 eller 55 på flera olika frågor. Prata med eleven.'],
  ['unanswered', 'Obesvarade med uträkning', 'Uträkning finns i räknehäftet men svarsrutan är tom.'],
  ['input', 'Inmatning', 'Rätt tänkt men fel skrivet.'],
  ['repeated_task', 'Fel på samma uppgift flera gånger', 'Samma fråga fel minst tre gånger.'],
  ['observation', 'Enstaka fel som liknar ett mönster', 'Ett räknefel eller ett mönster som inte upprepas än. Ingen felförståelse.'],
  ['without_link', 'Felmodell utan kopplad felförståelse', 'Appen känner igen felet men det är inte kopplat till en godkänd felförståelse.'],
  ['unexplained', 'Oförklarade', 'Appen kan inte förklara svaret. Ditt öga behövs.']
]

function Answer({ row, name, cardId }) {
  return <li className="flex justify-between gap-2 border-b border-slate-200 py-0.5 last:border-b-0">
    <span>{name(row.studentId)}</span>
    <span className="text-right tabular-nums"><QuestionText>{row.promptSv.replace(/^Räkna ut /u, '').replace(/\.$/u, '')}</QuestionText>{' → '}
      <span className="font-semibold text-red-700">{row.studentAnswer ?? 'tomt'}</span>
      {row.correctAnswer != null && <s className="ml-1 text-slate-500">{row.correctAnswer}</s>}
      {cardId && row.singleOccurrence && <span className="block text-xs text-slate-600">En gång i screeningen</span>}
      {cardId && row.teacherMisconceptionIds?.includes(cardId) && <span className="block text-xs text-slate-600">Lärarens val</span>}
      {row.keyNoteSv && <span className="block text-xs text-slate-600">{row.keyNoteSv}</span>}</span>
  </li>
}

export default function ScreeningMisconceptions({ members, isAllowed, mismatched = [], name, selected, onSelect }) {
  const [parts, setParts] = useState(null)
  const [message, setMessage] = useState('Hämtar felförståelser...')
  const memberKey = members.map(member => `${member.classId}:${member.assignmentId}`).join(',')
  useEffect(() => {
    let active = true
    setParts(null)
    setMessage('Hämtar felförståelser...')
    void Promise.all(members.map(async ({ classId, assignmentId }) => {
      const search = new URLSearchParams({ classId, assignmentId, view: 'misconceptions' })
      const result = await diagnosticRequest(`/api/teacher-diagnostic-attempts?${search}`)
      if (!result.ok) throw new Error(result.data.error || 'Kunde inte hämta felförståelserna.')
      return { classId, pupils: result.data.pupils }
    })).then(parts => { if (active) { setParts(parts); setMessage('') } })
      .catch(error => { if (active) setMessage(error.message) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey])

  // The same pupils as the table: allowed recipients, each once, classes with other questions left out.
  const view = useMemo(() => {
    if (!parts) return null
    const seen = new Set(), pupils = []
    for (const { classId, pupils: list } of parts) {
      if (mismatched.includes(classId)) continue
      for (const pupil of list) {
        if (!isAllowed(classId, pupil.studentId) || seen.has(pupil.studentId)) continue
        seen.add(pupil.studentId)
        pupils.push(pupil)
      }
    }
    return screeningMisconceptionView(pupils)
  }, [parts, isAllowed, mismatched])
  useEffect(() => {
    if (view && selected && !view.cards.some(card => card.id === selected.id)) onSelect(null)
  }, [view, selected, onSelect])

  if (!view) return <p role="status" className="mt-2 text-sm">{message}</p>
  const { counts, cards, other } = view
  const chips = [[counts.wrong, 'fel'], [counts.misconception - other.without_link.length, 'pekar på en felförståelse'], [other.without_link.length, 'känt fel utan felförståelse'], [counts.gave_up, 'ger upp'],
    [counts.input, 'inmatning'], [counts.repeated_task, 'samma uppgift flera gånger'], [counts.observation, 'enstaka'],
    [counts.unexplained, 'oförklarade'], [counts.unansweredWithWork, 'obesvarade med uträkning']]
  return <section aria-label="Felförståelser i screeningen" className="mt-3">
    <h3 className="text-base font-semibold">Felförståelser i screeningen</h3>
    <p className="text-sm text-slate-600">Misstankar ur svaren, inte diagnoser. Pröva i samtal.</p>
    <div className="my-2 flex flex-wrap gap-1.5 text-sm">{chips.filter(([value], index) => index < 2 || value > 0).map(([value, label]) =>
      <span key={label} className="rounded-full border border-slate-300 bg-white px-2"><b>{value}</b> {label}</span>)}</div>
    {counts.teacherMarkedNotWrong > 0 && <p className="text-xs text-slate-600">{counts.teacherMarkedNotWrong} fel svar räknas inte här eftersom läraren bedömt dem som rätt eller ofullständiga.</p>}
    {cards.length ? <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-2.5">{cards.map(card => {
      const pressed = selected?.id === card.id
      const toggle = () => onSelect(pressed ? null : { id: card.id, keys: new Set(card.answers.map(answer => answer.key)) })
      // A div, since a button may not hold the answer list.
      return <div key={card.id} role="button" tabIndex={0} aria-pressed={pressed} onClick={toggle}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle() } }}
        className="cursor-pointer rounded-md border border-l-[6px] border-slate-300 border-l-indigo-500 bg-white px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-indigo-600 aria-pressed:outline aria-pressed:outline-[3px] aria-pressed:outline-indigo-600">
        <span className="flex items-baseline justify-between gap-2"><span className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">{card.areaSv}</span>
          <span className="whitespace-nowrap font-semibold">{card.pupils} {card.pupils === 1 ? 'elev' : 'elever'}</span></span>
        <span className="block font-semibold">{card.titleSv}</span>
        <dl className="my-1 grid grid-cols-[auto_1fr] gap-x-2"><dt className="text-slate-600">Tänker</dt><dd>{card.logicSv}</dd>
          <dt className="text-slate-600">Behöver urskilja</dt><dd>{card.criticalAspectSv}</dd></dl>
        <ul className="border-t border-slate-200">{card.answers.map(row => <Answer key={`${card.id}:${row.key}`} row={row} name={name} cardId={card.id} />)}</ul>
      </div>
    })}</div> : <p className="text-sm text-slate-600">Inga felförståelser bland de valda elevernas svar.</p>}
    {OTHER_BOXES.some(([key]) => other[key].length > 0) && <>
      <h4 className="mt-3 text-sm font-semibold">Övrigt att titta på</h4>
      <div className="mt-1 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5">{OTHER_BOXES.filter(([key]) => other[key].length).map(([key, title, note]) =>
        <div key={key} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <h5 className="font-semibold">{title} · {other[key].length}</h5>
          <p className="text-xs text-slate-600">{note}</p>
          <ul>{other[key].map(row => <Answer key={row.key} row={row} name={name} />)}</ul>
        </div>)}</div>
    </>}
  </section>
}
