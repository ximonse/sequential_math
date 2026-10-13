import { useEffect, useRef, useState } from 'react'
import { FocusActivitySession, FOCUS_DURATION_MS } from '../../lib/focusActivity'

const BUTTON = 'rounded-xl px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
const MODE_LABELS = { discover: 'Upptäck', choose: 'Välj' }

export default function FocusActivity({ onClose }) {
  const [session] = useState(() => new FocusActivitySession())
  const [, redraw] = useState(0)
  const responseButton = useRef(null)
  const dialog = useRef(null)
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
    if (['practice', 'running'].includes(session.phase)) responseButton.current?.focus()
    else dialog.current?.querySelector('button')?.focus()
  }, [session.phase])

  const active = ['practice', 'running'].includes(session.phase)
  const summary = session.summary()
  const feedback = session.practiceFeedback
  const correct = feedback && ['hit', 'withheld'].includes(feedback.outcome)
  const signalClass = session.signal === 'red' ? 'bg-[#f87171]' : session.signal ? 'bg-[#4ade80]' : 'bg-[#ffffff]'
  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="focus-title" onKeyDown={event => {
      if (event.key !== 'Tab') return
      const buttons = [...dialog.current.querySelectorAll('button')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }} className="fixed inset-0 z-50 overflow-y-auto bg-black text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
          <div><h1 id="focus-title" className="text-xl font-semibold tracking-wide">Fokuspunkten</h1><p className="mt-1 text-sm text-[#94a3b8]">En stund att vänta, upptäcka och välja.</p></div>
          <button className={`${BUTTON} bg-white/10`} onClick={() => active || session.phase === 'paused' ? act(() => session.finish()) : onClose()}>{active || session.phase === 'paused' ? 'Avsluta' : 'Tillbaka'}</button>
        </header>
        {session.phase === 'setup' && <section className="my-auto py-8">
          <h2 className="text-2xl font-semibold">Välj din uppvärmning</h2>
          <p className="mt-4 text-[#cbd5e1]">Titta på punkten och dutta på knappen vid rätt signal. Du får blinka normalt.</p>
          <p className="mt-3 text-[#cbd5e1]">Du provar tre signaler först. Sedan följer två minuter. Väntan blandas och ökar från 3–10 till 3–20 sekunder under passet.</p>
          <div className="mt-6 grid gap-3">
            <button className={`${BUTTON} border border-white/30 text-left`} onClick={() => act(() => session.practice('discover'))}><span className="block text-lg">Upptäck</span><span className="block text-sm font-normal text-[#cbd5e1]">Dutta när den vita cirkeln blir grön.</span></button>
            <button className={`${BUTTON} border border-white/30 text-left`} onClick={() => act(() => session.practice('choose'))}><span className="block text-lg">Välj</span><span className="block text-sm font-normal text-[#cbd5e1]">Dutta på grön cirkel. Avstå vid röd cirkel eller grön fyrkant.</span></button>
          </div>
        </section>}
        {active && <section className="flex flex-1 flex-col py-5">
          <div className="flex justify-between text-sm text-[#94a3b8]"><span>{MODE_LABELS[session.mode]} · {session.phase === 'practice' ? `Övningssignal ${session.practiceIndex + 1} av 3` : 'Pågående pass'}</span><span>{session.phase === 'running' ? `${Math.ceil((FOCUS_DURATION_MS - session.activeTime()) / 1000)} s kvar` : 'Öva först'}</span></div>
          <div className="flex min-h-48 flex-1 items-center justify-center" aria-hidden="true"><div data-testid="focus-point" data-signal={session.signal || 'waiting'} className={`h-7 w-7 ${signalClass} ${session.signal === 'square' ? 'rounded-none' : 'rounded-full'}`} /></div>
          <div className="mb-4 min-h-16 text-center" role="status">
            {feedback ? <><p className="font-semibold">{correct ? 'Precis så!' : 'Prova nästa signal.'}</p><p className="mt-1 text-sm text-[#cbd5e1]">{feedback.signal === 'go' ? 'Grön cirkel: dutta på knappen.' : feedback.signal === 'red' ? 'Röd cirkel: låt bli knappen.' : 'Grön fyrkant: låt bli knappen.'}</p></> : <p className="text-[#94a3b8]">{session.now() < session.ackUntil ? 'Tryck registrerat' : session.mode === 'discover' ? 'Dutta när cirkeln blir grön.' : 'Dutta bara på grön cirkel.'}</p>}
          </div>
          <button ref={responseButton} className={`${BUTTON} min-h-20 touch-manipulation bg-[#ffffff] text-black focus-visible:outline-green-400`} onKeyDown={event => { if (event.repeat) event.preventDefault() }} onClick={() => act(() => session.press())}>Dutta</button>
        </section>}
        {session.phase === 'paused' && <section className="my-auto py-8"><h2 className="text-2xl font-semibold">Passet är pausat</h2><p className="my-4 text-[#cbd5e1]">Tiden står stilla. När du fortsätter börjar en ny väntan.</p><button className={`${BUTTON} bg-[#ffffff] text-black`} onClick={() => act(() => session.resume())}>Fortsätt</button></section>}
        {session.phase === 'ready' && <section className="my-auto py-8"><h2 className="text-2xl font-semibold">Nu är du redo</h2><p className="my-4 text-[#cbd5e1]">{MODE_LABELS[session.mode]} · Två minuter med blandade väntetider. Du kan avsluta när du vill.</p><button className={`${BUTTON} bg-[#ffffff] text-black`} onClick={() => act(() => session.start())}>Starta passet</button></section>}
        {session.phase === 'finished' && <section className="my-auto py-8">
          <h2 className="text-2xl font-semibold">{session.aborted ? 'Passet avbröts' : 'Passet är klart'}</h2>
          <p className="mt-3 text-[#cbd5e1]">Här är det som hann bli färdigt. Resultatet sparas inte.</p>
          <dl className="my-6 grid grid-cols-2 gap-4">
            {[[ 'Träffar', summary.hits ], [ 'Missade signaler', summary.misses ], [ 'För tidiga tryck', summary.early ], [ 'Tryck på fel signal', summary.wrong ], ...(session.mode === 'choose' ? [['Rätt avstådda signaler', summary.withheld]] : []), ...(summary.median !== null ? [['Medianreaktionstid', `${Math.round(summary.median)} ms`]] : [])].map(([label, value]) => <div key={label} className="border-t border-white/20 pt-3"><dt className="text-sm text-[#94a3b8]">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>)}
          </dl>
          <button className={`${BUTTON} w-full bg-[#ffffff] text-black`} onClick={onClose}>Tillbaka</button>
        </section>}
      </div>
    </div>
  )
}
