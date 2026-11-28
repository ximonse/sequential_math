import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { decodeAssignmentPayload } from '../../lib/assignments.js'
import { getConceptDeck, latestConceptRun, recordConceptActivity } from '../../lib/conceptPractice.js'
import { getPilotStudentRuntime } from '../../lib/pilotStudentRuntime.js'
import ScreeningImageQuestion, { ScreeningImage } from './ScreeningImageQuestion.jsx'
import { QuestionCard } from './practice/PracticeLayout.jsx'
import SessionHeader from './SessionHeader.jsx'
import FloatingNotices from './session/FloatingNotices.jsx'
import StudentSyncStatus from './session/StudentSyncStatus.jsx'
import { useStudentSyncStatus } from './session/useStudentSyncStatus.js'
import { choiceFeedback, useAnswerReveal } from './session/useAnswerReveal.js'
import { PRACTICE_AUTO_CONTINUE_DELAY_MS } from './session/usePracticeUiEffects.js'
import { useConceptSpeech } from './session/useConceptSpeech.js'
import './conceptFlashcard.css'

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
    <p className="mb-2 mt-3 text-base text-gray-600">Välj ett kort och sedan ett fält. Du kan också dra kortet.</p>
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
  useEffect(() => {
    if (!result?.correct) return undefined
    const timer = setTimeout(next, PRACTICE_AUTO_CONTINUE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [result, next])
  const titles = Object.fromEntries(deck.cards.map(card => [card.id, card.title]))
  const canSubmit = exercise.task ? answer.length > 0 : Object.keys(answer).length === exercise.objects.length
  const choices = exercise.task?.options.filter(option => exercise.task.correctOptionIds.includes(option.id))
  return <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <QuestionCard align="left" size="text"><h2>{exercise.prompt}</h2></QuestionCard>
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
    <div className="mt-3 flex justify-end">
      <button type="button" className={`${action} answer-submit-button`} disabled={busy || (result ? !reveal : !canSubmit)}
        onClick={result ? next : () => save(answer)}>{result ? 'Fortsätt' : 'Svara'}</button>
    </div>
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
  const latestProfile = useRef(null)
  const localWrites = useRef(Promise.resolve())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [section, setSection] = useState('cards')
  const [cardIndex, setCardIndex] = useState(0)
  const [turned, setTurned] = useState(false)
  const [shownExercise, setShownExercise] = useState(null)
  const advanceExercise = useCallback(() => setShownExercise(null), [])

  const validEntry = Boolean(deck && (!params.has('assignment') || assignmentId))
  const save = useCallback((kind, detail = {}, { fresh = false, onSaved } = {}) => {
    const write = localWrites.current.then(() => {
      const current = latestProfile.current
      if (!current) return false
      const pupilClass = current.classId || current.classIds?.[0] || null
      const currentRun = latestConceptRun(current, deck, assignmentId, pupilClass ? [pupilClass] : [])
      if (!fresh && kind === 'open_cards' && currentRun?.cardsOpenedAt) return true
      if (kind === 'flip' && Object.hasOwn(currentRun?.cards || {}, detail.cardId)) return true

      setError('')
      const eventId = crypto.randomUUID()
      const timestamp = Date.now()
      const payload = { kind, runId: fresh ? eventId : currentRun?.runId || eventId, deckId: deck.id, deckVersion: deck.version,
        assignmentId, classIdAtAttempt: pupilClass, timestamp, ...detail }
      const next = structuredClone(current)
      if (!recordConceptActivity(next, payload)) return false

      // Each write builds on the last local snapshot. Network sync can finish later.
      return new Promise((resolve, reject) => {
        runtime.persistEvent(next, { id: eventId, type: 'concept_activity', timestamp, payload }, () => {
          latestProfile.current = next
          setProfile(next)
          onSaved?.()
          resolve(true)
        }).then(result => {
          if (result?.error && !result?.pendingCount) setError(result.error)
          resolve(false)
        }, reject)
      })
    }).catch(() => {
      setError('Aktiviteten kunde inte sparas. Försök igen.')
      return false
    })
    localWrites.current = write
    return write
  }, [assignmentId, deck, runtime])

  useEffect(() => {
    if (!validEntry) return undefined
    let live = true
    runtime.bootstrap(studentId).then(result => {
      if (!live) return
      if (!result.ok) {
        navigate('/', { replace: true })
        return
      }
      latestProfile.current = result.profile
      setProfile(result.profile)
      void save('open_cards')
    }).catch(() => { if (live) setError('Elevsessionen kunde inte öppnas.') })
    return () => { live = false }
  }, [runtime, studentId, navigate, save, validEntry])

  const pupilClass = profile?.classId || profile?.classIds?.[0] || null
  const run = deck && latestConceptRun(profile, deck, assignmentId, pupilClass ? [pupilClass] : [])

  const item = deck?.cards[cardIndex]
  const nextExercise = deck?.exercises.find(exercise => !Object.hasOwn(run?.answers || {}, exercise.id))
  const exercise = shownExercise || nextExercise
  const spokenText = section === 'cards' ? (turned ? item?.explanation : item?.title)
    : section === 'exercises' ? exercise?.prompt : ''
  const speech = useConceptSpeech({ studentId, defaultEnabled: Boolean(assignmentId && assignment.conceptSpeechByDefault),
    cue: section === 'cards' ? item?.id : exercise?.id, text: profile ? spokenText : '' })
  if (!validEntry) return <p className="p-4">Begreppsövningen kunde inte öppnas.</p>
  const completed = Boolean(run && !nextExercise)
  const openCards = () => { setSection('cards'); setCardIndex(0); setTurned(false) }
  const openExercises = () => { setSection('exercises'); setShownExercise(null) }
  const stepCard = amount => { setCardIndex(index => index + amount); setTurned(false) }
  const flipCard = () => {
    setTurned(!turned)
    if (!turned) void save('flip', { cardId: item.id })
  }

  async function saveExercise(answer) {
    setBusy(true)
    await save('answer', { exerciseId: exercise.id, answer }, { onSaved: () => setShownExercise(exercise) })
    setBusy(false)
  }

  async function restart() {
    setBusy(true)
    await save('open_cards', {}, { fresh: true, onSaved: openCards })
    setBusy(false)
  }

  return <div className="min-h-[100dvh] overflow-x-hidden student-role-surface py-1 sm:py-8">
    <main className="mx-auto max-w-5xl px-3 sm:px-4">
      <SessionHeader profileName="Begrepp" onExit={() => navigate('/student/' + studentId)} />
      <FloatingNotices>
        <StudentSyncStatus status={status} />
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 shadow">{error}</p>}
      </FloatingNotices>
      <div className="space-y-3 pt-1 pb-4 sm:py-8">
        <h1 className="text-lg font-semibold text-gray-800">{deck.title}</h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={section === 'cards' ? action : secondary} aria-pressed={section === 'cards'} disabled={busy}
            onClick={openCards}>Begreppskort</button>
          <button type="button" className={section === 'exercises' ? action : secondary} aria-pressed={section === 'exercises'} disabled={!profile || busy}
            onClick={openExercises}>Öva begreppen</button>
        </div>
        {profile && speech.supported && <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={speech.enabled} onChange={event => speech.setEnabled(event.target.checked)} />
            Läs upp automatiskt
          </label>
          {spokenText && <button type="button" className={secondary} onClick={speech.speak}>Lyssna</button>}
        </div>}
        {section === 'cards' && <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 max-w-prose text-sm text-gray-700">Här övar du på begreppen. Tänk efter ordentligt först. Om du fastnar eller vill kolla om du tänkte rätt, tryck på kortet och läs baksidan. Gå sedan vidare när du är redo.</p>
          <p className="mb-2 text-sm text-gray-600">Kort {cardIndex + 1} av {deck.cards.length} · {Object.keys(run?.cards || {}).length} vända</p>
          <p className="sr-only" role="status">{spokenText}</p>
          <button type="button" className="concept-flashcard rounded-2xl focus-visible:outline-2 focus-visible:outline-blue-700"
            aria-label="Vänd kortet" aria-pressed={turned} disabled={!profile} onClick={flipCard}>
            <span key={item.id} className="concept-flashcard__sides rounded-xl border-2 border-blue-100 bg-blue-50 shadow-sm">
              <span aria-hidden={turned} className="concept-flashcard__side">
                <span className="text-2xl font-bold">{item.title}</span>
                <span className="text-sm font-normal text-gray-600">Tryck för att vända</span>
              </span>
              <span aria-hidden={!turned} className="concept-flashcard__side concept-flashcard__side--back">
                <span className="text-lg font-medium text-blue-950 md:text-xl">{item.explanation}</span>
                {item.image && <span className="w-28"><ScreeningImage image={item.image} /></span>}
              </span>
            </span>
          </button>
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <button type="button" className={secondary} disabled={!profile || cardIndex === 0} onClick={() => stepCard(-1)}>Föregående</button>
            <button type="button" className={action} disabled={!profile || cardIndex === deck.cards.length - 1} onClick={() => stepCard(1)}>Nästa kort</button>
          </div>
        </section>}
        {section === 'exercises' && (exercise ? <Exercise key={exercise.id} exercise={exercise} deck={deck}
          busy={busy} result={run?.answers[exercise.id]} next={advanceExercise}
          save={saveExercise} />
          : completed && <section className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Övningen är klar</h2>
            <p className="mb-3">{Object.values(run.answers).filter(answer => answer.correct).length} av {deck.exercises.length} uppgifter rätt på första försöket.</p>
            <button type="button" className={secondary} disabled={busy} onClick={restart}>Öva igen</button>
          </section>)}
        {!profile && !error && <p role="status" className="text-sm text-gray-600">Öppnar elevsessionen…</p>}
      </div>
    </main>
  </div>
}
