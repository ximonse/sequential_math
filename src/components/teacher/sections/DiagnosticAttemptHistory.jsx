import ScreeningImageQuestion from '../../student/ScreeningImageQuestion.jsx'
import { useMemo, useState } from 'react'
import { describeDiagnosticEvent, diagnosticHistoryFrame } from '../../../domains/arithmetic/diagnosticHistory'
import DiagnosticNotebookGrid from './DiagnosticNotebookGrid.js'
import MathScratchpad from '../../student/MathScratchpad'
import { choiceObservation, isChoiceTask } from '../../../domains/arithmetic/screeningImageQuestions.js'

export default function DiagnosticAttemptHistory({ snapshot, task, imageContext = {} }) {
  const lastStep = snapshot.events.length
  const [step, setStep] = useState(lastStep)
  const frame = useMemo(() => diagnosticHistoryFrame(snapshot, step), [snapshot, step])
  const event = snapshot.events[step - 1]
  const choice = isChoiceTask(task)
  const answer = choice ? choiceObservation(task, frame).explicitAnswer || 'inga val' : frame.answer || 'inte skrivet'

  return <section className="mt-3" aria-label="Elevens inmatningsförlopp">
    <h5 className="font-semibold">{task?.responseMode ? 'Så ändrades svaret' : 'Så ändrades räknehäftet'}</h5>
    <p className="text-sm text-slate-700">Stega genom sparade händelser. Det visar vad eleven valde, skrev och ändrade, inte varför.</p>
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <button type="button" onClick={() => setStep(0)} disabled={step === 0} className="rounded border px-1.5 py-0.5 disabled:opacity-40">Början</button>
      <button type="button" onClick={() => setStep(value => value - 1)} disabled={step === 0} className="rounded border px-1.5 py-0.5 disabled:opacity-40">Föregående</button>
      <label className="flex items-center gap-2">Steg {step} av {lastStep}
        <input type="range" min="0" max={lastStep || 1} value={step} disabled={!lastStep}
          onChange={change => setStep(Number(change.target.value))} aria-label="Välj steg i elevens inmatningsförlopp" />
      </label>
      <button type="button" onClick={() => setStep(value => value + 1)} disabled={step === lastStep} className="rounded border px-1.5 py-0.5 disabled:opacity-40">Nästa</button>
      <button type="button" onClick={() => setStep(lastStep)} disabled={step === lastStep} className="rounded border px-1.5 py-0.5 disabled:opacity-40">Slutbild</button>
    </div>
    <p className="mt-2 text-sm" aria-live="polite">{event?.type === 'selection_change' ? 'Ändrade valda alternativ.' : describeDiagnosticEvent(event)} {choice ? 'Val då' : 'Slutsvar då'}: {answer}.</p>
    {task?.responseMode && <ScreeningImageQuestion task={task} selected={frame.selectedOptionIds || []} disabled context={imageContext} />}
    <div hidden={task?.gridEnabled === false} className="mt-3 overflow-x-auto">
      <DiagnosticNotebookGrid frame={frame} label={`Elevens uppställning efter steg ${step}`} />
    </div>
    {frame.drawing?.length > 0 && <MathScratchpad visible strokes={frame.drawing} readOnly />}
  </section>
}
