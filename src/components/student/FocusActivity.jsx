import { useEffect, useRef, useState } from 'react'
import { FocusActivitySession } from '../../lib/focusActivity'

const BUTTON = 'rounded-xl px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
const MODE_LABELS = { discover: '1 - FOKUS', choose: '2 - KONTROLL' }

export default function FocusActivity({ onClose }) {
  const [session] = useState(() => new FocusActivitySession())
  const [, redraw] = useState(0)
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
    if (['practice', 'running'].includes(session.phase)) dialog.current?.focus()
    else dialog.current?.querySelector('button')?.focus()
  }, [session.phase])

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
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="focus-title" onKeyDown={trapFocus} className="fixed inset-0 z-50 overflow-y-auto bg-black text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-start justify-between gap-4 border-b border-white/20 pb-4">
          <div><h1 id="focus-title" className="text-xl font-semibold tracking-wide">Fokuspunkten</h1><p className="mt-1 text-sm text-[#94a3b8]">En stund att vänta, upptäcka och välja.</p></div>
          <button className={`${BUTTON} bg-white/10`} onClick={() => active || session.phase === 'paused' ? act(() => session.finish()) : onClose()}>{active || session.phase === 'paused' ? 'Avsluta' : 'Tillbaka'}</button>
        </header>
        {session.phase === 'setup' && <section className="my-auto py-8">
          <h2 className="text-2xl font-semibold">Välj din uppvärmning</h2>
          <p className="mt-4 text-[#cbd5e1]">Titta på punkten och dutta var som helst på skärmen vid rätt signal. Du får blinka normalt. På tangentbordet använder du mellanslag eller Enter.</p>
          <p className="mt-3 text-[#cbd5e1]">Du provar tre signaler först. Sedan följer två minuter. Väntan blandas och ökar från 3–10 till 3–20 sekunder under passet.</p>
          <div className="mt-6 grid gap-3">
            <button className={`${BUTTON} border border-white/30 text-left`} onClick={() => act(() => session.practice('discover'))}><span className="block text-lg">1 - FOKUS</span><span className="block text-sm font-normal text-[#cbd5e1]">Dutta när den vita cirkeln blir grön.</span></button>
            <button className={`${BUTTON} border border-white/30 text-left`} onClick={() => act(() => session.practice('choose'))}><span className="block text-lg">2 - KONTROLL</span><span className="block text-sm font-normal text-[#cbd5e1]">Dutta vid grön cirkel. Avstå vid röd cirkel eller grön fyrkant.</span></button>
          </div>
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
