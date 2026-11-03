import { useEffect, useRef, useState } from 'react'
import NumberKeys from '../components/student/NumberKeys'

export default function NotebookTools({ formats, disabled, lineMode, eraseMode, onLine, onErase, onLoan,
  canLoan, onKey, onSign, signsDisabled, gridEnabled, status, onGuide = null, answerActive = false,
  divisionArmed = false, onDivision = null }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpHovered, setHelpHovered] = useState(false)
  const helpVisible = helpOpen || helpHovered
  const [symbolsOpen, setSymbolsOpen] = useState(false)
  const helpRef = useRef(null)
  useEffect(() => {
    const dismiss = event => {
      if (event.type === 'keydown' && event.key === 'Escape') { setHelpOpen(false); setHelpHovered(false); setSymbolsOpen(false) }
      else if (event.type === 'pointerdown' && !helpRef.current?.contains(event.target)) { setHelpOpen(false); setHelpHovered(false) }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', dismiss)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss) }
  }, [])
  return <aside className="notebook-tools">
    <div className="notebook-status-row">
      <div className="notebook-save-status" role="status">{status}</div>
      {gridEnabled && onGuide && <button type="button" className="notebook-guide-button" aria-label="Visa hur räknehäftet fungerar"
        title="Visa hur räknehäftet fungerar" onClick={onGuide}>?</button>}
    </div>
    {gridEnabled && <div className="notebook-tool-row">
      {formats}
      <button type="button" aria-label="Streckläge" aria-pressed={lineMode} onClick={onLine} disabled={disabled}>
        <svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true"><path d="M2 16h24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
      </button>
      {onDivision && <button type="button" aria-label="Kort division" title="Kort division: markera en ruta och tryck, eller tryck och välj ruta"
        aria-pressed={divisionArmed} onClick={onDivision} disabled={disabled}>
        <svg viewBox="0 0 28 20" width="28" height="20" aria-hidden="true"><path d="M2 10h12M18 7h8M18 13h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>}
      <button type="button" aria-label="Suddverktyg" aria-pressed={eraseMode} onClick={onErase} disabled={disabled}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m3 14 10-10 8 8-9 9H8zM8 9l8 8M12 21h10" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      </button>
      <button type="button" onClick={onLoan} disabled={disabled || !canLoan} aria-label="Stryk"><s>Stryk</s></button>
      <div className="notebook-help" ref={helpRef} onPointerEnter={event => { if (event.pointerType === 'mouse') setHelpHovered(true) }} onPointerLeave={() => setHelpHovered(false)}>
        <button type="button" className="notebook-info" aria-label="Touchgenvägar" aria-expanded={helpVisible}
          aria-controls="notebook-touch-help" onClick={() => setHelpOpen(value => !value)}>ⓘ</button>
        {helpVisible && <div id="notebook-touch-help" className="notebook-popover">
          <h3>Touchgenvägar</h3>
          <p><strong>Streck:</strong> Håll kort på en tom ruta och dra längs rutlinjen.</p>
          <p><strong>Stryk / låna:</strong> Håll kort på en stor eller liten siffra och dra åt höger eller vänster.</p>
          <p><strong>Minnessiffra:</strong> Håll kort på siffran och dra nedåt för att göra den liten. Dra uppåt för stor siffra.</p>
          <p>Ett kort tryck markerar bara rutan. Håll utan att dra ändrar ingenting.</p>
        </div>}
      </div>
    </div>}
    <div className="notebook-keypad" role="group" aria-label="Sifferknappar">
      {(gridEnabled || answerActive) && <>
        <div className="notebook-operators" role="group" aria-label="Räknetecken">
          {['−', '×', '/', '+'].map(sign => <button key={sign} type="button" aria-label={`Skriv ${sign}`}
            onClick={() => onSign(sign)} disabled={disabled || signsDisabled}>{sign}</button>)}
        </div>
      </>}
      <div className="notebook-numbers"><NumberKeys onKey={onKey} disabled={disabled} labelPrefix="Skriv" /></div>
      <div className="notebook-delete">
        <button type="button" aria-label="Radera siffra" disabled={disabled} onClick={() => onKey('backspace')}>Radera</button>
        <button type="button" disabled={disabled} title="Töm bara den markerade rutan eller svarsrutan" onClick={() => onKey('clear')}>Rensa</button>
      </div>
      {/* Simon 2026-11-03: the extra signs open below Radera/Rensa as ordinary keys. */}
      {(gridEnabled || answerActive) && <div className="notebook-symbols">
        <button type="button" aria-expanded={symbolsOpen} onClick={() => setSymbolsOpen(value => !value)}>{symbolsOpen ? '▾' : '▸'} Fler tecken · procent & algebra</button>
        {symbolsOpen && <div className="notebook-symbol-grid">
          {['x', 'y', 'a', 'b', '=', '²', '%', '÷', '(', ')', 'n', 'c'].map(sign => <button key={sign} type="button"
            aria-label={`Skriv ${sign}`} disabled={disabled || signsDisabled} onClick={() => onSign(sign)}>{sign}</button>)}
        </div>}
      </div>}
    </div>
  </aside>
}
