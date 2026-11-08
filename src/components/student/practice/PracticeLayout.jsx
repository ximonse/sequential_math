import { useCallback, useEffect, useMemo, useState } from 'react'
import { NotebookAnswerTarget } from './notebookAnswerTarget'
import './practiceLayout.css'

// Shared frame for every kind of practice question, so arithmetic, fractions,
// algebra and word problems look alike and nothing moves after answering.
export default function PracticeLayout({ question, answer, status, keypad, primary = null, tools = null, scratchpad = null, notebook = null,
  notebookOpen = false, onCloseNotebook }) {
  // In the notebook sheet the notebook's own keypad writes the answer once the pupil
  // taps the answer box, so no on-screen keyboard is needed for number answers.
  const [answerChosen, setAnswerChosen] = useState(false)
  const answerActive = notebookOpen && answerChosen
  const onKey = keypad?.props?.onKey
  const answerTarget = useMemo(() => ({
    active: answerActive,
    onKey: character => onKey?.(character === '-' ? '−' : character),
    onLeave: () => setAnswerChosen(false)
  }), [answerActive, onKey])
  const closeSheet = useCallback(() => { setAnswerChosen(false); onCloseNotebook?.() }, [onCloseNotebook])

  useEffect(() => {
    if (!notebookOpen) return undefined
    const onKeyDown = event => { if (event.key === 'Escape') closeSheet() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [notebookOpen, closeSheet])

  const layout = <div className={`practice-layout ${notebookOpen ? 'practice-layout--notebook' : ''}`}>
    <div className="practice-layout__question flex flex-col items-stretch gap-2 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">{question}</div>
      <div className="flex shrink-0 items-center justify-center gap-2 text-3xl font-bold text-gray-800">
        <span aria-hidden="true">=</span>
        <div onPointerDown={() => { if (notebookOpen) setAnswerChosen(true) }}
          className={answerActive ? 'rounded ring-4 ring-blue-400' : ''}>{answer}</div>
        {notebookOpen && primary && <button type="button" onClick={primary.onClick} disabled={primary.disabled}
          className={`h-14 rounded-xl px-4 text-xl font-bold text-white disabled:bg-gray-300 ${primary.isAnswering ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
          {primary.isAnswering ? 'Svara' : 'Nästa'}</button>}
      </div>
    </div>
    <div className="practice-layout__status">{status}</div>
    <div className="practice-layout__keypad" hidden={notebookOpen}>{keypad}</div>
    {(tools || scratchpad) && <div className="practice-layout__tools" hidden={notebookOpen}>
      {tools && <div className="flex flex-wrap justify-center gap-2">{tools}</div>}
      {scratchpad}
    </div>}
    {/* Stays mounted while closed, so the notebook keeps what the pupil wrote. */}
    {notebook && <div className="practice-layout__notebook" hidden={!notebookOpen}>{notebook}</div>}
  </div>

  // The same elements either way: opening the sheet only changes classes, so the
  // notebook, the answer and the keypad keep their state.
  return <NotebookAnswerTarget.Provider value={answerTarget}><div role={notebookOpen ? 'dialog' : undefined} aria-modal={notebookOpen ? 'true' : undefined}
    aria-label={notebookOpen ? 'Räknehäfte' : undefined} className={notebookOpen ? 'practice-notebook-sheet bg-white' : 'w-full'}>
    <div className={notebookOpen ? 'mx-auto max-w-5xl' : ''}>
      {notebookOpen && <div className="mb-2 flex justify-end">
        <button type="button" onClick={closeSheet}
          className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700">Dölj räknehäfte</button>
      </div>}
      {layout}
    </div>
  </div></NotebookAnswerTarget.Provider>
}

// The question itself: same box, size and colours for every kind of task. Talpar
// and Dubblor keep their own sizes: small on phones, large from iPad width.
const SIZES = { large: 'text-3xl md:text-4xl', text: 'text-lg font-medium md:text-xl', prompt: 'text-lg leading-tight md:text-5xl md:py-2' }

export function QuestionCard({ label = '', children, align = 'center', size = 'large', preWrap = false }) {
  return <div className={`rounded-2xl border-2 border-blue-100 bg-blue-50 px-4 py-3 ${align === 'left' ? 'text-left' : 'text-center'}`}>
    {label && <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-700">{label}</p>}
    <div className={`break-words font-bold text-gray-900 ${SIZES[size]} ${preWrap ? 'whitespace-pre-wrap' : ''}`}>{children}</div>
  </div>
}

// The answer slot keeps one size whether it holds the input or the correct answer.
// Number answers use the app's keys, so touch screens get no device keyboard; a
// written answer (for example an explanation) needs the device keyboard (Simon 2026-11-08).
export function AnswerBox({ isAnswering, inputRef, value, onChange, onSubmit, inputMode, result, textAnswer = false }) {
  return <div className="flex h-14 w-40 items-center justify-center md:w-44">
    {isAnswering ? <input ref={inputRef} type="text" inputMode={textAnswer ? 'text' : inputMode} value={value} autoComplete="off" placeholder="?"
      onChange={event => onChange(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && value.trim() !== '') onSubmit() }}
      className="h-14 w-full rounded border-b-4 border-gray-400 bg-gray-100 text-center text-3xl focus:border-blue-500 focus:outline-none md:text-4xl" />
      : <span className="truncate text-3xl font-bold text-green-600 md:text-4xl">{result}</span>}
  </div>
}

// Right or wrong, the pupil's crossed-out answer and the hint share one fixed line.
export function PracticeStatus({ feedback, studentAnswer }) {
  const partial = Boolean(feedback?.isPartial)
  const heading = !feedback ? '' : feedback.correct ? (partial ? 'Nästan rätt' : 'Rätt!') : 'Inte riktigt'
  const tone = !feedback ? '' : feedback.correct ? (partial ? 'text-amber-700' : 'text-green-700') : 'text-red-600'
  const hint = !feedback ? '' : partial ? (feedback.partialDetail || 'Skriv svaret i förenklad matematisk form.')
    : feedback.correct && feedback.hint ? feedback.hint
      : feedback.correct ? 'Enter, knappsatsknappen eller vänta...' : 'Tryck Enter eller knappsatsknappen när du är redo'
  return <div className="flex h-14 flex-col items-center justify-center text-center" aria-live="polite">
    {feedback && <p className="text-xl font-bold leading-tight">
      <span className={tone}>{heading}</span>
      {!feedback.correct && <span className="ml-2 font-semibold text-red-600 line-through">Du svarade: {studentAnswer}</span>}
    </p>}
    {feedback && <p className="truncate text-sm text-gray-500">{hint}</p>}
  </div>
}
