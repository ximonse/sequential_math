import { useMemo, useState } from 'react'
import { describeDiagnosticEvent, diagnosticHistoryFrame } from '../../../domains/arithmetic/diagnosticHistory'
import DiagnosticGridLines from '../../../dev/DiagnosticGridLines'
import MathScratchpad from '../../student/MathScratchpad'

export default function DiagnosticAttemptHistory({ snapshot }) {
  const lastStep = snapshot.events.length
  const [step, setStep] = useState(lastStep)
  const frame = useMemo(() => diagnosticHistoryFrame(snapshot, step), [snapshot, step])
  const event = snapshot.events[step - 1]

  return <section className="mt-3" aria-label="Elevens inmatningsförlopp">
    <h5 className="font-semibold">Så ändrades räknehäftet</h5>
    <p className="text-sm text-slate-700">Stega genom sparade händelser. Det visar vad eleven skrev och ändrade, inte varför.</p>
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <button type="button" onClick={() => setStep(0)} disabled={step === 0} className="rounded border px-2 py-1 disabled:opacity-40">Början</button>
      <button type="button" onClick={() => setStep(value => value - 1)} disabled={step === 0} className="rounded border px-2 py-1 disabled:opacity-40">Föregående</button>
      <label className="flex items-center gap-2">Steg {step} av {lastStep}
        <input type="range" min="0" max={lastStep || 1} value={step} disabled={!lastStep}
          onChange={change => setStep(Number(change.target.value))} aria-label="Välj steg i elevens inmatningsförlopp" />
      </label>
      <button type="button" onClick={() => setStep(value => value + 1)} disabled={step === lastStep} className="rounded border px-2 py-1 disabled:opacity-40">Nästa</button>
      <button type="button" onClick={() => setStep(lastStep)} disabled={step === lastStep} className="rounded border px-2 py-1 disabled:opacity-40">Slutbild</button>
    </div>
    <p className="mt-2 text-sm" aria-live="polite">{describeDiagnosticEvent(event)} Slutsvar då: {frame.answer || 'inte skrivet'}.</p>
    <div className="mt-3 overflow-x-auto">
      <div className="diagnostic-grid" role="grid" aria-label={`Elevens uppställning efter steg ${step}`}>
        <DiagnosticGridLines lines={frame.lines} rows={frame.rows} columns={frame.columns} />
        {Array.from({ length: frame.rows * frame.columns }, (_, index) => {
          const row = Math.floor(index / frame.columns)
          const column = index % frame.columns
          const cell = frame.cells[`${row}:${column}`] || {}
          return <div key={`${row}:${column}`} className={`diagnostic-cell ${cell.note ? 'diagnostic-cell--note' : ''}`}
            role="gridcell" aria-label={`rad ${row + 1}, kolumn ${column + 1}, ${cell.main || cell.note || 'tom'}`}>
            {cell.main && <span className={`diagnostic-cell__digit diagnostic-cell__digit--main ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}`}>{cell.main}</span>}
            {cell.note && <span className={`diagnostic-cell__digit diagnostic-cell__digit--note ${cell.struck ? 'diagnostic-cell__digit--struck' : ''}`}>{cell.note}</span>}
          </div>
        })}
      </div>
    </div>
    {frame.drawing?.length > 0 && <MathScratchpad visible strokes={frame.drawing} readOnly />}
  </section>
}
