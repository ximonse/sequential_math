import { useId, useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import './diagnosticScreening.css'

const labels = { correct: 'Rätt svar', incorrect: 'Fel svar utan identifierat mönster',
  incomplete: 'Ofullständigt svar', unanswered: 'Ej svar' }
const colors = { correct: 'screening-answer--correct', incorrect: 'screening-answer--incorrect',
  incomplete: 'screening-answer--incomplete', unanswered: 'screening-answer--unanswered',
  M: 'screening-answer--M', P: 'screening-answer--P', Ö: 'screening-answer--transfer' }

export default function DiagnosticScreeningCell({ item, pupilName, prompt, onOpen }) {
  const id = useId()
  const [position, setPosition] = useState(null)
  const timer = useRef(null)
  const button = useRef(null)
  const summary = item.screening
  const status = summary?.answerStatus || 'unanswered'
  const signals = summary?.signals || []
  const value = summary?.explicitAnswer ?? '—'
  const label = status === 'incorrect' && signals.length ? 'Fel svar' : labels[status]
  useEffect(() => () => clearTimeout(timer.current), [])
  function show() {
    clearTimeout(timer.current)
    const rect = button.current.getBoundingClientRect()
    setPosition({ left: Math.max(8, Math.min(window.innerWidth - 292, rect.left)),
      top: rect.top > window.innerHeight / 2 ? rect.top - 8 : rect.bottom + 8,
      above: rect.top > window.innerHeight / 2 })
  }
  function hideSoon() { timer.current = setTimeout(() => setPosition(null), 120) }
  return <>
    <button ref={button} type="button" disabled={!item.attemptId} onClick={() => { setPosition(null); onOpen(item) }}
      onMouseEnter={show} onMouseLeave={hideSoon} onFocus={show} onBlur={() => setPosition(null)}
      onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setPosition(null) } }}
      aria-describedby={position ? id : undefined}
      aria-label={`${pupilName}, ${prompt}, svar ${value}, ${label}${signals.length ? `, ${signals.map(signal => signal.label).join(', ')}` : ''}`}
      className={`w-full min-w-16 rounded px-2 py-1 font-semibold tabular-nums outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-default ${status === 'correct' ? colors.correct : colors[signals[0]?.code] || colors[status]}`}>
      {value}{signals.map(signal => <span key={signal.code} className="ml-1 text-[10px] font-medium">{signal.code}</span>)}
    </button>
    {position && createPortal(<div id={id} role="tooltip" onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hideSoon}
      className="fixed z-[100] w-[280px] rounded border border-slate-300 bg-white p-2 text-sm text-slate-800 shadow-lg"
      style={{ left: position.left, top: position.top, transform: position.above ? 'translateY(-100%)' : undefined }}>
      <strong>{prompt}</strong><dl className="mt-1 grid grid-cols-2 gap-x-3"><dt>Elevens svar</dt><dd className="text-right font-semibold">{value}</dd>
        <dt>Rätt svar</dt><dd className="text-right font-semibold">{summary?.expectedAnswer ?? '—'}</dd></dl>
      {signals.map(signal => <p key={signal.code} className="mt-1 border-t border-slate-200 pt-1">{signal.message}</p>)}
      <p className="mt-1 text-xs text-slate-600">{label} · {item.status === 'submitted' ? 'Inlämnat' : 'Pågående'}</p>
    </div>, document.body)}
  </>
}
