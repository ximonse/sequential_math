import { useEffect, useRef, useState } from 'react'
import { markNotebookTutorialSeen } from './notebookTutorialSeen'
import './notebookTutorial.css'

const STEPS = [
  { id: 'write', title: 'Skriv en siffra',
    text: 'Tryck på en ruta. Tryck sedan på en siffra på knappsatsen.' },
  { id: 'line', title: 'Dra ett långt streck',
    text: 'Håll fingret stilla på en tom ruta en kort stund. Dra längs rutlinjen och släpp.' },
  { id: 'note', title: 'Gör en minnessiffra',
    text: 'Håll fingret på siffran och dra nedåt. Då blir den liten. Dra uppåt för att göra den stor igen.' },
  { id: 'strike', title: 'Stryk över när du lånar',
    text: 'Håll fingret på siffran och dra åt sidan. Då stryks den över. Knappen Låna gör samma sak på den markerade rutan.' }
]

function Demo({ step }) {
  return <div className={`notebook-tutorial__demo notebook-tutorial__demo--${step}`} aria-hidden="true">
    <div className="notebook-tutorial__grid">
      {Array.from({ length: 8 }, (_, index) => <span key={index} className="notebook-tutorial__cell">
        {index === 1 && step === 'write' && <b className="notebook-tutorial__digit notebook-tutorial__digit--written">8</b>}
        {index === 1 && step === 'note' && <>
          <b className="notebook-tutorial__digit notebook-tutorial__digit--big">1</b>
          <b className="notebook-tutorial__digit notebook-tutorial__digit--small">1</b>
        </>}
        {index === 1 && step === 'strike' && <b className="notebook-tutorial__digit notebook-tutorial__digit--strikable">5</b>}
      </span>)}
      {step === 'line' && <span className="notebook-tutorial__line" />}
      <span className="notebook-tutorial__finger"><span className="notebook-tutorial__hold" /></span>
    </div>
    {step === 'write' && <div className="notebook-tutorial__keys">
      {['7', '8', '9'].map(key => <span key={key} className={`notebook-tutorial__key ${key === '8' ? 'notebook-tutorial__key--pressed' : ''}`}>{key}</span>)}
    </div>}
  </div>
}

export default function NotebookTutorial({ onClose, scope = '' }) {
  const [index, setIndex] = useState(0)
  const dialogRef = useRef(null)
  const primaryRef = useRef(null)
  const step = STEPS[index]
  const last = index === STEPS.length - 1

  useEffect(() => { primaryRef.current?.focus() }, [index])
  const close = () => { markNotebookTutorialSeen(scope); onClose() }

  return <div className="notebook-tutorial" role="presentation" onKeyDown={event => { if (event.key === 'Escape') close() }}>
    <section ref={dialogRef} className="notebook-tutorial__card" role="dialog" aria-modal="true" aria-labelledby="notebook-tutorial-title">
      <div className="notebook-tutorial__top">
        <p className="notebook-tutorial__kicker">Så använder du räknehäftet</p>
        <button type="button" className="notebook-tutorial__skip" onClick={close}>Hoppa över</button>
      </div>
      <ol className="notebook-tutorial__steps" aria-label="Steg">
        {STEPS.map((item, position) => <li key={item.id}>
          <button type="button" aria-current={position === index ? 'step' : undefined} aria-label={`Steg ${position + 1}: ${item.title}`}
            onClick={() => setIndex(position)}>{position + 1}</button>
        </li>)}
      </ol>
      <h2 id="notebook-tutorial-title">{step.title}</h2>
      <Demo key={step.id} step={step.id} />
      <p className="notebook-tutorial__text">{step.text}</p>
      <div className="notebook-tutorial__actions">
        <button type="button" onClick={() => setIndex(value => value - 1)} disabled={index === 0}>Tillbaka</button>
        <button ref={primaryRef} type="button" className="notebook-tutorial__next"
          onClick={() => (last ? close() : setIndex(value => value + 1))}>{last ? 'Börja räkna' : 'Nästa'}</button>
      </div>
    </section>
  </div>
}
