import QuestionText from '../../QuestionText'

const field = 'rounded border border-slate-400 px-1 py-0.5'

// Questions the teacher assesses by reading the pupil's text (no answer key).
// Several can be added; text still in the box is also part of the screening, so
// nothing written is lost if the teacher goes on without pressing "Lägg till".
export default function ScreeningCustomQuestion({ tasks = [], onTasks, disabled, customPrompt, onCustomPrompt, customGrid, onCustomGrid, customDrawing, onCustomDrawing }) {
  const add = () => {
    if (!customPrompt.trim() || tasks.length >= 12) return
    onTasks([...tasks, { promptSv: customPrompt.trim(), gridEnabled: customGrid, drawingEnabled: customDrawing }])
    onCustomPrompt('')
  }
  return <details className="mt-3 text-sm" open={tasks.length > 0 || undefined}>
    <summary className="cursor-pointer font-semibold">Frågor med textsvar som du bedömer{tasks.length ? ` (${tasks.length})` : ''}</summary>
    <fieldset disabled={disabled} className="mt-2 space-y-2">
      <legend className="sr-only">Frågor med textsvar</legend>
      {tasks.length > 0 && <ol className="list-decimal space-y-1 pl-5">{tasks.map((task, index) => <li key={index}>
        <p className="whitespace-pre-wrap"><QuestionText>{task.promptSv}</QuestionText></p>
        <p className="text-slate-600">{task.gridEnabled === false ? 'Huvudräkning' : 'Räknehäfte'}{task.drawingEnabled ? ' · Rityta' : ''}</p>
        <button type="button" className={field} onClick={() => onTasks(tasks.filter((_, i) => i !== index))}>Ta bort textfråga {index + 1}</button>
      </li>)}</ol>}
      <label className="block">Frågetext<textarea value={customPrompt} maxLength={2000} onChange={event => onCustomPrompt(event.target.value)} className="mt-1 block w-full rounded border p-1" /></label>
      <p className="text-slate-600">{'Bråk: skriv 6//2 eller \\frac{6}{2}.'}</p>
      {customPrompt.trim() && <div role="region" aria-label="Förhandsvisning av frågan">
        <p className="font-semibold">Förhandsvisning</p>
        <p className="whitespace-pre-wrap break-words"><QuestionText>{customPrompt}</QuestionText></p>
      </div>}
      <label className="mr-2"><input type="checkbox" checked={!customGrid} onChange={event => onCustomGrid(!event.target.checked)} /> Huvudräkning för skrivfrågan</label>
      <label><input type="checkbox" checked={customDrawing} onChange={event => onCustomDrawing(event.target.checked)} /> Rityta till skrivfrågan</label>
      <div><button type="button" className={field} onClick={add} disabled={!customPrompt.trim() || tasks.length >= 12}>Lägg till textfråga</button></div>
    </fieldset>
  </details>
}
