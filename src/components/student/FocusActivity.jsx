import { useEffect, useRef, useState } from 'react'
import { FocusActivitySession } from '../../lib/focusActivity'
import MultiActivity from './MultiActivity'
import useAttentionResult from './useAttentionResult'
import AttentionSaveStatus from './AttentionSaveStatus'
import './focusActivities.css'

const BUTTON = 'rounded-xl px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
const MODE_LABELS = { discover: '1 - FOKUS', choose: '2 - KONTROLL' }

export default function FocusActivity(props) {
  const [attempt, setAttempt] = useState(0)
  return <FocusAttempt key={attempt} {...props} restart={attempt > 0} onRestart={() => setAttempt(value => value + 1)} />
}

function FocusAttempt({ onClose, studentId, restart, onRestart }) {
  const [session] = useState(() => {
    const model = new FocusActivitySession()
    if (restart) model.start()
    return model
  })
  const [multiOpen, setMultiOpen] = useState(false)
  const [, redraw] = useState(0)
  const dialog = useRef(null)
  const saveStatus = useAttentionResult(session, studentId, session.mode)
  const refresh = () => redraw(value => value + 1)
  const act = action => { action(); refresh() }
  useEffect(() => {
    const timer = ['practice', 'running'].includes(session.phase)
      ? setInterval(() => { session.tick(); redraw(value => value + 1) }, 50) : null
    const onVisibility = () => {
      if (document.hidden) { session.pause(); redraw(value => value + 1) }
    }
    document.addEventListener('visibilitychange', onVisibility)
    onVisibility()
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility) }
  }, [session, session.phase])
  useEffect(() => {
    if (['practice', 'running'].includes(session.phase)) dialog.current?.focus()
    else dialog.current?.querySelector('button')?.focus()
  }, [session.phase, multiOpen])

  const active = ['practice', 'running'].includes(session.phase)
  const summary = session.summary()
  const signalClass = session.signal === 'red' ? 'bg-[#f87171]' : session.signal ? 'bg-[#4ade80]' : 'bg-[#ffffff]'
  const trapFocus = event => {
    if (event.key !== 'Tab') return
    const targets = [...(active ? [dialog.current] : []), ...dialog.current.querySelectorAll('button')]
    const first = targets[0], last = targets.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  if (multiOpen) return <MultiActivity studentId={studentId} onClose={onClose} onBack={() => setMultiOpen(false)} />
  if (active) {
    return (
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Fokuspunkten" tabIndex={0}
        onPointerDown={event => {
          if (event.target.closest('button') || event.button !== 0 || event.isPrimary === false) return
          event.preventDefault()
          dialog.current.focus()
          act(() => session.press())
        }}
        onKeyDown={event => {
          trapFocus(event)
          if (event.target !== event.currentTarget || ![' ', 'Enter'].includes(event.key)) return
          event.preventDefault()
          if (!event.repeat) act(() => session.press())
        }}
        className="fixed inset-0 z-50 flex touch-manipulation select-none items-center justify-center overflow-hidden bg-black text-white outline-none">
        <div aria-hidden="true" data-testid="focus-point" data-signal={session.signal || 'waiting'}
          className={`h-3.5 w-3.5 ${signalClass} ${session.signal === 'square' ? 'rounded-none' : 'rounded-full'}`} />
        <button className={`${BUTTON} absolute right-5 top-5 text-[#94a3b8]`}
          onPointerDown={event => event.stopPropagation()}
          onClick={() => act(() => session.finish())}>Avsluta</button>
      </div>
    )
  }
  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="focus-title" onKeyDown={trapFocus} className="focus-activity fixed inset-0 z-50 overflow-y-auto">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
          <div><h1 id="focus-title" className="text-xl font-semibold tracking-wide">Fokuspunkten</h1><p className="mt-1 text-sm text-[#94a3b8]">En stund att vänta, upptäcka och välja.</p></div>
          <button disabled={session.phase === 'finished' && ['idle', 'saving'].includes(saveStatus.state) && saveStatus.hasResult} className={`${BUTTON} bg-white/10 disabled:opacity-50`} onClick={() => active || session.phase === 'paused' ? act(() => session.finish()) : onClose()}>{active || session.phase === 'paused' ? 'Avsluta' : 'Tillbaka'}</button>
        </header>
        {session.phase === 'setup' && <section className="my-auto py-8">
          <h2 className="text-2xl font-semibold">Välj din uppvärmning</h2>
          <p className="mt-4 text-[#cbd5e1]">Titta på punkten och dutta var som helst på skärmen vid rätt signal. Du får blinka normalt. På tangentbordet använder du mellanslag eller Enter.</p>
          <p className="mt-3 text-[#cbd5e1]">Du provar tre signaler först. Sedan följer två minuter. Väntan blandas och ökar från 3–10 till 3–20 sekunder under passet.</p>
          <p className="mt-3 text-sm text-[#cbd5e1]">Passets resultat och svarens tidpunkter sparas till din lärare. Introduktionen sparas inte.</p>
          <div className="mt-6 grid gap-3">
            <button className="focus-choice" onClick={() => act(() => session.practice('discover'))}><span className="block text-lg font-semibold">1 - FOKUS</span><span className="mt-1 block text-sm focus-muted">Dutta när den vita cirkeln blir grön.</span></button>
            <button className="focus-choice" onClick={() => act(() => session.practice('choose'))}><span className="block text-lg font-semibold">2 - KONTROLL</span><span className="mt-1 block text-sm focus-muted">Dutta vid grön cirkel. Avstå vid röd cirkel eller grön fyrkant.</span></button>
            <button className="focus-choice" onClick={() => setMultiOpen(true)}><span className="block text-lg font-semibold">MULTI</span><span className="mt-1 block text-sm focus-muted">Växla mellan figurens form och antalet prickar.</span></button>
          </div>
        </section>}
        {session.phase === 'paused' && <section className="my-auto py-8"><h2 className="text-2xl font-semibold">Passet är pausat</h2><p className="my-4 text-[#cbd5e1]">Tiden står stilla. När du fortsätter börjar en ny väntan.</p><button className={`${BUTTON} bg-[#ffffff] text-black`} onClick={() => act(() => session.resume())}>Fortsätt</button></section>}
        {session.phase === 'ready' && <section className="my-auto py-8"><h2 className="text-2xl font-semibold">Nu är du redo</h2><p className="my-4 text-[#cbd5e1]">{MODE_LABELS[session.mode]} · Två minuter med blandade väntetider. Du kan avsluta när du vill.</p>{session.mode === 'discover' && <p className="my-3 text-[#cbd5e1]">Om inget svar kommer inom fem sekunder efter grönt får du frågan om du vill starta om. Försöket sparas som ej fullföljt. Det räknas inte som en låg fokusnivå.</p>}<button className={`${BUTTON} bg-[#ffffff] text-black`} onClick={() => act(() => session.start())}>Starta passet</button></section>}
        {session.phase === 'finished' && <section className="my-auto py-8">
          <h2 className="text-2xl font-semibold">{session.completionReason === 'no_response' ? 'Ska vi starta om?' : session.aborted ? 'Passet avbröts' : 'Passet är klart'}</h2>
          <p className="mt-3 text-[#cbd5e1]">{session.completionReason === 'no_response' ? 'Inget svar kom inom fem sekunder på grönt. Försöket sparas som ej fullföljt. Du kan börja om med två nya minuter.' : 'Här är det som hann bli färdigt.'}</p>
          <dl className="my-6 grid grid-cols-2 gap-4">
            {[[ 'Träffar', summary.hits ], [ 'Missade signaler', summary.misses ], [ 'För tidiga tryck', summary.early ], [ 'Tryck på fel signal', summary.wrong ], ...(session.mode === 'choose' ? [['Rätt avstådda signaler', summary.withheld]] : []), ...(summary.median !== null ? [['Medianreaktionstid', `${Math.round(summary.median)} ms`]] : [])].map(([label, value]) => <div key={label} className="border-t border-white/20 pt-3"><dt className="text-sm text-[#94a3b8]">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>)}
          </dl>
          <AttentionSaveStatus status={saveStatus} />
          {session.completionReason === 'no_response' && <button disabled={!['pending', 'saved'].includes(saveStatus.state)} className={`${BUTTON} my-3 w-full bg-[#ffffff] text-black disabled:opacity-50`} onClick={onRestart}>Ja, starta om</button>}
          <button disabled={saveStatus.hasResult && ['idle', 'saving'].includes(saveStatus.state)} className={`${BUTTON} w-full bg-[#ffffff] text-black disabled:opacity-50`} onClick={onClose}>Tillbaka</button>
        </section>}
      </div>
    </div>
  )
}
