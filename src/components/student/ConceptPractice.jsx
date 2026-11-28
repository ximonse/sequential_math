import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { decodeAssignmentPayload } from '../../lib/assignments.js'
import { getConceptDeck, latestConceptRun, recordConceptActivity } from '../../lib/conceptPractice.js'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime.js'
import ScreeningImageQuestion, { ScreeningImage } from './ScreeningImageQuestion.jsx'
import StudentSyncStatus from './session/StudentSyncStatus.jsx'
import { useStudentSyncStatus } from './session/useStudentSyncStatus.js'
import { choiceFeedback, useAnswerReveal } from './session/useAnswerReveal.js'

const action = 'rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50'
const buttonFrame = 'rounded-lg px-3 py-1.5 font-medium'
const secondary = `${buttonFrame} border border-gray-300 text-gray-800 hover:bg-gray-50`

function SortingExercise({ exercise, titles, answer, disabled, result, reveal, change }) {
  const [active, setActive] = useState(null)
  const place = (object, field) => {
    if (!disabled && exercise.objects.some(item => item.id === object)) {
      change({ ...answer, [object]: field })
      setActive(null)
    }
  }
  const card = object => {
    const correct = reveal || answer[object.id] === object.field
    const appearance = result ? buttonFrame : `${secondary} bg-white`
    return <button key={object.id} type="button" draggable={!disabled} disabled={disabled}
      data-answer-feedback={result ? (correct ? 'correct' : 'incorrect') : undefined}
      aria-description={result ? (correct ? 'Rätt placering' : 'Fel placering') : undefined}
      aria-label={object.text.replace(/\[([^\]]+)\]/g, '$1 (markerat)')} aria-pressed={active === object.id}
      onDragStart={event => event.dataTransfer.setData('text/plain', object.id)}
      onClick={() => setActive(object.id)}
      className={`${appearance} concept-sort-card ${active === object.id ? 'ring-2 ring-blue-700' : ''}`}>
      {object.text.split(/(\[[^\]]+\])/).map((part, index) => part.startsWith('[')
        ? <strong key={index} className="rounded bg-blue-100 px-0.5 text-blue-950">{part.slice(1, -1)}</strong> : part)}
      {result && <span className="ml-1 font-bold" aria-hidden="true">{correct ? '✓' : '×'}</span>}
    </button>
  }
  return <>
    <p className="mb-2 text-sm text-gray-600">Välj ett kort och sedan ett fält. Du kan också dra kortet.</p>
    <div aria-label="Kort att placera" className="mb-3 flex min-h-10 flex-wrap gap-2">
      {exercise.objects.filter(object => !answer[object.id]).map(card)}
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {exercise.fields.map(field => <div key={field} role="group" aria-label={titles[field]} className="rounded-lg border border-blue-200 bg-blue-50 p-2"
        onDragOver={event => { if (!disabled) event.preventDefault() }}
        onDrop={event => { event.preventDefault(); place(event.dataTransfer.getData('text/plain'), field) }}>
        <button type="button" disabled={disabled || !active} className="mb-1 w-full text-left font-semibold text-blue-950"
          onClick={() => place(active, field)}>{titles[field]}</button>
        <div className="flex min-h-8 flex-wrap gap-1">{exercise.objects.filter(object => (reveal && result ? object.field : answer[object.id]) === field).map(card)}</div>
      </div>)}
    </div>
  </>
}

function Exercise({ exercise, deck, busy, result, save, next }) {
  const [answer, setAnswer] = useState(exercise.task ? [] : {})
  const reveal = useAnswerReveal(result)
  const titles = Object.fromEntries(deck.cards.map(card => [card.id, card.title]))
  const canSubmit = exercise.task ? answer.length > 0 : Object.keys(answer).length === exercise.objects.length
  const choices = exercise.task?.options.filter(option => exercise.task.correctOptionIds.includes(option.id))
  return <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <h2 className="mb-3 text-lg font-semibold">{exercise.prompt}</h2>
    {exercise.task ? <ScreeningImageQuestion task={exercise.task} selected={answer} disabled={busy || Boolean(result)} onChange={setAnswer}
      getFeedback={result ? id => choiceFeedback(id, answer, exercise.task.correctOptionIds, reveal) : undefined} />
      : <SortingExercise exercise={exercise} titles={titles} answer={answer} disabled={busy || Boolean(result)} result={result} reveal={reveal} change={setAnswer} />}
    {reveal && <div role="status" className="mt-3 rounded-lg bg-gray-100 px-3 py-2">
      {result.correct ? 'Rätt!' : exercise.task ? <>
        <p>Rätt svar</p>
        <div className="flex flex-wrap gap-2">{choices.map(option => option.image
          ? <span key={option.id} className="inline-block w-24"><ScreeningImage image={option.image} /></span>
          : <span key={option.id}>{option.labelSv}</span>)}</div>
      </> : <ul className="space-y-1">{exercise.objects.filter(x => answer[x.id] !== x.field).map(object =>
        <li key={object.id}>{object.text} hör till <strong>{titles[object.field]}</strong>.</li>)}</ul>}
    </div>}
    <button type="button" className={`${action} answer-submit-button mt-3`} disabled={busy || (result ? !reveal : !canSubmit)}
      onClick={result ? next : () => save(answer)}>{result ? 'Fortsätt' : 'Svara'}</button>
  </section>
}

export default function ConceptPractice() {
  const { studentId, deckId } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const deck = getConceptDeck(deckId)
  const assignment = decodeAssignmentPayload(params.get('assignment_payload'))
  const assignmentId = assignment?.kind === 'concept' && assignment.conceptDeckId === deckId && assignment.id === params.get('assignment') ? assignment.id : ''
  const runtime = getPilotStudentRuntime()
  const status = useStudentSyncStatus(studentId)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [section, setSection] = useState('start')
  const [cardIndex, setCardIndex] = useState(0)
  const [turned, setTurned] = useState(false)
  const [shownExercise, setShownExercise] = useState(null)

  useEffect(() => {
    let live = true
    runtime.bootstrap(studentId).then(result => {
      if (!live) return
      if (!result.ok) navigate('/', { replace: true })
      else setProfile(result.profile)
    }).catch(() => { if (live) setError('Elevsessionen kunde inte öppnas.') })
    return () => { live = false }
  }, [runtime, studentId, navigate])

  const pupilClass = profile?.classId || profile?.classIds?.[0] || null
  const run = deck && latestConceptRun(profile, deck, assignmentId, pupilClass ? [pupilClass] : [])
  async function save(kind, detail = {}, onSaved, fresh = false) {
    if (!profile || busy) return
    setBusy(true)
    setError('')
    const eventId = crypto.randomUUID()
    const timestamp = Date.now()
    const payload = { kind, runId: fresh ? eventId : run?.runId || eventId, deckId: deck.id, deckVersion: deck.version,
      assignmentId, classIdAtAttempt: pupilClass, timestamp, ...detail }
    const next = structuredClone(profile)
    let savedLocally = false
    try {
      recordConceptActivity(next, payload)
      const result = await runtime.persistEvent(next, { id: eventId, type: 'concept_activity', timestamp, payload }, () => {
        savedLocally = true
        setProfile(next)
        onSaved?.()
        setBusy(false)
      })
      if (result?.error && !result?.pendingCount) setError(result.error)
    } catch {
      setError('Aktiviteten kunde inte sparas. Försök igen.')
    } finally {
      if (!savedLocally) setBusy(false)
    }
  }

  if (!deck || (params.has('assignment') && !assignmentId)) return <p className="p-4">Begreppsövningen kunde inte öppnas.</p>
  const item = deck.cards[cardIndex]
  const nextExercise = deck.exercises.find(exercise => !Object.hasOwn(run?.answers || {}, exercise.id))
  const exercise = shownExercise || nextExercise
  const completed = Boolean(run && !nextExercise)
  const openCards = () => { setSection('cards'); setCardIndex(0); setTurned(false) }
  const openExercises = () => { setSection('exercises'); setShownExercise(null) }
  const startCards = () => run?.cardsOpenedAt ? openCards() : save('open_cards', {}, openCards)
  const startExercises = () => run ? openExercises() : save('open', {}, openExercises)
  const stepCard = amount => { setCardIndex(cardIndex + amount); setTurned(false) }

  return <main className="mx-auto max-w-3xl space-y-3 px-4 pb-6 text-gray-900">
    <Link className="inline-block text-sm font-semibold text-blue-800" to={`/student/${studentId}`}>← Till startsidan</Link>
    <h1 className="text-2xl font-semibold">{deck.title}</h1>
    <StudentSyncStatus status={status} />
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {!profile ? !error && <p>Öppnar…</p> : <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={section !== 'exercises' ? action : secondary} aria-pressed={section === 'cards'} disabled={busy}
          onClick={startCards}>Begreppskort</button>
        <button type="button" className={section === 'exercises' ? action : secondary} aria-pressed={section === 'exercises'} disabled={busy}
          onClick={startExercises}>Öva begreppen</button>
      </div>
      {section === 'cards' && <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm text-gray-600">Kort {cardIndex + 1} av {deck.cards.length} · {Object.keys(run?.cards || {}).length} vända</p>
        <h2 className="text-xl font-semibold">{item.title}</h2>
        {turned ? <div className="mt-2 space-y-2" aria-live="polite">
          <p>{item.explanation}</p>
          {item.image && <div className="w-28"><ScreeningImage image={item.image} /></div>}
        </div> : <button type="button" className={`${action} mt-2`} disabled={busy}
          onClick={() => Object.hasOwn(run?.cards || {}, item.id) ? setTurned(true) : save('flip', { cardId: item.id }, () => setTurned(true))}>Vänd kortet</button>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={secondary} disabled={busy || cardIndex === 0} onClick={() => stepCard(-1)}>Föregående</button>
          <button type="button" className={secondary} disabled={busy || cardIndex === deck.cards.length - 1} onClick={() => stepCard(1)}>Nästa kort</button>
        </div>
      </section>}
      {section === 'exercises' && (exercise ? <Exercise key={exercise.id} exercise={exercise} deck={deck}
        busy={busy} result={run?.answers[exercise.id]} next={() => setShownExercise(null)}
        save={answer => save('answer', { exerciseId: exercise.id, answer }, () => setShownExercise(exercise))} />
        : completed && <section className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Övningen är klar</h2>
          <p className="mb-3">{Object.values(run.answers).filter(answer => answer.correct).length} av {deck.exercises.length} uppgifter rätt på första försöket.</p>
          <button type="button" className={secondary} disabled={busy} onClick={() => save('open_cards', {}, openCards, true)}>Öva igen</button>
        </section>)}
    </>}
  </main>
}
