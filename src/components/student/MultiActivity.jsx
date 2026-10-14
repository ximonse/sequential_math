import { useEffect, useRef, useState } from 'react'
import { MultiActivitySession } from '../../lib/multiActivity'
import './focusActivities.css'

const RULES = { shape: 'Form', count: 'Antal' }
const FIGURES = { diamond: 'romb', square: 'fyrkant' }

function MultiSymbol({ trial }) {
  const positions = trial.dots === 2 ? [62, 98] : [54, 80, 106]
  return (
    <svg viewBox="0 0 160 160" className="multi-symbol" role="img" aria-label={`${FIGURES[trial.shape]} med ${trial.dots} prickar`}>
      {trial.shape === 'diamond'
        ? <rect className="multi-symbol-outline" x="35" y="35" width="90" height="90" rx="12" transform="rotate(45 80 80)" />
        : <rect className="multi-symbol-outline" x="25" y="25" width="110" height="110" rx="24" />}
      {positions.map(y => <circle className="multi-symbol-dot" key={y} cx="80" cy={y} r="7" />)}
    </svg>
  )
}

function MultiResult({ summary }) {
  return <>
    <div className="my-5 grid grid-cols-3 gap-3">
      {[['Rätt', summary.correct], ['Fel', summary.wrong], ['Missade', summary.missed]].map(([label, value]) => <div key={label} className="multi-rule-card"><p className="focus-muted text-sm">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
    </div>
    <p className="focus-muted mb-4">{summary.total ? `${Math.round(100 * summary.correct / summary.total)} % rätt av ${summary.total} uppgifter.` : 'Inga uppgifter hann bli färdiga.'}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {[[ 'Upprepad regel', summary.repeat ], [ 'Bytt regel', summary.switch ]].map(([label, group]) => <section key={label} className="multi-rule-card"><h3 className="font-semibold">{label}</h3><p className="focus-muted mt-2 text-sm">{group.correct} rätt av {group.total}</p><p className="mt-2">{group.median === null ? 'Ingen svarstid att jämföra ännu.' : `Median: ${Math.round(group.median)} ms`}</p></section>)}
    </div>
    <p className="focus-muted my-4 text-sm">Svarstiderna gäller rätta svar i det här passet. Resultatet sparas inte.</p>
  </>
}

export default function MultiActivity({ onClose, onBack }) {
  const [session] = useState(() => new MultiActivitySession())
  const [, redraw] = useState(0)
  const dialog = useRef(null)
  const active = ['practice', 'running'].includes(session.phase)
  const act = action => { action(); redraw(value => value + 1) }
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
  const trial = session.trial
  const displayedTrial = trial || session.feedback || session.trials?.[session.trialIndex]
  const practiceRule = session.trialIndex < 4 ? 'Bara form' : session.trialIndex < 8 ? 'Bara antal' : 'Blandade regler'
  const close = () => active || session.phase === 'paused' ? act(() => session.finish()) : session.phase === 'setup' ? onBack() : onClose()
  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-label="MULTI" tabIndex={active ? 0 : -1}
      onKeyDown={event => {
        if (event.key === 'Tab') {
          const targets = [...(active ? [dialog.current] : []), ...dialog.current.querySelectorAll('button')]
          if (event.shiftKey && document.activeElement === targets[0]) { event.preventDefault(); targets.at(-1).focus() }
          if (!event.shiftKey && document.activeElement === targets.at(-1)) { event.preventDefault(); targets[0].focus() }
        }
        if (!active || event.target.closest('[data-close]') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
        event.preventDefault()
        if (!event.repeat) act(() => session.press(event.key === 'ArrowLeft' ? 'left' : 'right'))
      }}
      className="focus-activity fixed inset-0 z-50 overflow-y-auto outline-none">
      {active ? <>
        <div className="absolute inset-0 grid grid-cols-2" aria-label="Svarsyta">
          {['left', 'right'].map(side => <button key={side} aria-label={side === 'left' ? 'Svara vänster' : 'Svara höger'} className="multi-hit relative"
            onPointerDown={event => {
              if (event.button !== 0 || event.isPrimary === false) return
              event.preventDefault(); dialog.current.focus(); act(() => session.press(side))
            }}
            onKeyDown={event => { if (event.repeat) event.preventDefault() }}
            onClick={event => { if (event.detail === 0) act(() => session.press(side)) }}>
            <span className="multi-hit-label">{side === 'left' ? 'Vänster' : 'Höger'}</span>
          </button>)}
        </div>
        <div className="pointer-events-none absolute left-5 top-5 text-sm focus-muted">MULTI{session.phase === 'practice' ? ` · ${practiceRule} · ${session.trialIndex + 1}/16` : ''}</div>
        <button data-close className="focus-back absolute right-3 top-2 z-10" onClick={close}>Avsluta</button>
        <div className="multi-stage">
          {['shape', 'count'].map(rule => <div key={rule} className="multi-zone" data-rule={rule} data-active={trial?.rule === rule}>
            <span className="multi-zone-label">{RULES[rule].toUpperCase()}</span>
            {trial?.rule === rule && <div data-testid="multi-trial" data-rule={rule} data-shape={trial.shape} data-dots={trial.dots}><MultiSymbol trial={trial} /></div>}
          </div>)}
        </div>
        {session.phase === 'practice' && <div className="multi-practice-feedback" role="status">
          {session.feedback && <p className="mb-1">{session.feedback.correct ? 'Rätt!' : session.feedback.timeout ? 'Tiden gick ut.' : 'Prova nästa uppgift.'}</p>}
          {displayedTrial && <p>{displayedTrial.rule === 'shape' ? 'Form: romb till vänster, fyrkant till höger.' : 'Antal: två till vänster, tre till höger.'}</p>}
        </div>}
      </> : <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 py-5">
        <header className="flex items-center justify-between"><h1 className="text-xl font-semibold">MULTI</h1><button className="focus-back" onClick={close}>{session.phase === 'paused' ? 'Avsluta' : 'Tillbaka'}</button></header>
        <section className="focus-panel my-auto">
          {session.phase === 'setup' && <>
            <p className="focus-muted mb-2 text-sm">VÄXLA MELLAN TVÅ REGLER</p>
            <h2 className="mb-4 text-2xl font-semibold">Samma figur. Ny regel.</h2>
            <div className="grid gap-3">
              <div className="multi-rule-card"><h3 className="font-semibold">Överst: titta på formen</h3><p className="focus-muted mt-1">Romb → vänster. Fyrkant → höger.</p></div>
              <div className="multi-rule-card"><h3 className="font-semibold">Nederst: räkna prickarna</h3><p className="focus-muted mt-1">Två → vänster. Tre → höger.</p></div>
            </div>
            <p className="focus-muted my-4">Dutta på vänster eller höger skärmhalva. På tangentbordet använder du piltangenterna. Du har fyra sekunder per uppgift.</p>
            <p className="focus-muted mb-5 text-sm">Öva först: fyra formuppgifter, fyra antalsuppgifter och åtta blandade. Sedan följer ett tvåminuterspass.</p>
            <button className="focus-action w-full" onClick={() => act(() => session.practice())}>Öva reglerna</button>
          </>}
          {session.phase === 'ready' && <><h2 className="text-2xl font-semibold">Redo att växla?</h2><p className="focus-muted my-4">Nu blandas reglerna. Överst gäller form, nederst gäller antal. Passet pågår i två minuter.</p><button className="focus-action w-full" onClick={() => act(() => session.start())}>Starta MULTI</button></>}
          {session.phase === 'paused' && <><h2 className="text-2xl font-semibold">MULTI är pausat</h2><p className="focus-muted my-4">Tiden står stilla. En obesvarad uppgift visas igen när du fortsätter.</p><button className="focus-action" onClick={() => act(() => session.resume())}>Fortsätt</button></>}
          {session.phase === 'finished' && <><h2 className="text-2xl font-semibold">{session.aborted ? 'MULTI avbröts' : 'MULTI är klart'}</h2><MultiResult summary={session.summary()} /><button className="focus-action w-full" onClick={onClose}>Tillbaka</button></>}
        </section>
      </div>}
    </div>
  )
}
